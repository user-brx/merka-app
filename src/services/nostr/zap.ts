import { finalizeEvent } from 'nostr-tools';
import type { NostrEvent } from 'nostr-tools';
import { pool, now } from './pool';
import { RELAYS } from './relayHealth';
import { bech32 } from '@scure/base';

/** Decodes lud16 (user@domain.com) or lud06 (lnurl1...) to an LNURL-pay endpoint */
export async function getLnurlEndpoint(lud16OrLud06: string): Promise<string | null> {
  const lnaddr = lud16OrLud06.trim().toLowerCase();
  
  if (lnaddr.includes('@')) {
    // lud16 format
    const [name, domain] = lnaddr.split('@');
    return `https://${domain}/.well-known/lnurlp/${name}`;
  } 
  
  if (lnaddr.startsWith('lnurl1')) {
    // lud06 format
    try {
      const { words } = bech32.decode(lnaddr as `lnurl1${string}`, 1023);
      const data = bech32.fromWords(words);
      return new TextDecoder().decode(Uint8Array.from(data));
    } catch {
      return null;
    }
  }

  return null;
}

/** Fetches LNURLpay properties and returns the callback & min/max constraints */
export async function fetchLnurlPayMetadata(endpoint: string) {
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    const domain = new URL(endpoint).hostname;
    throw new Error(`Cannot reach ${domain} — check network or try another Lightning address`);
  }
  if (!res.ok) throw new Error(`LNURL server returned ${res.status}`);
  return res.json();
}

/**
 * Creates the NIP-57 Zap Request (Kind 9734) 
 * Must be signed with the user's private key
 */
export function createZapRequest(
  sk: Uint8Array,
  recipientPubkey: string,
  eventId: string | undefined,
  amountSats: number,
  comment: string = ''
) {
  // Amount in millisatoshis
  const msats = amountSats * 1000;
  
  const tags = [
    ['relays', ...RELAYS],
    ['amount', msats.toString()],
    ['p', recipientPubkey]
  ];

  if (eventId) {
    tags.push(['e', eventId]);
  }

  const zapReq = finalizeEvent({
    kind: 9734,
    created_at: now(),
    content: comment,
    tags
  }, sk);

  return zapReq;
}

/** Requests the BOLT11 Invoice from the LN-Pay callback */
export async function fetchZapInvoice(
  callback: string,
  msats: number,
  zapRequestEvent: NostrEvent
): Promise<string> {
  const url = new URL(callback);
  url.searchParams.append('amount', msats.toString());
  url.searchParams.append('nostr', JSON.stringify(zapRequestEvent));

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    const domain = new URL(url.toString()).hostname;
    throw new Error(`Cannot reach ${domain} — check network or try another Lightning address`);
  }
  if (!res.ok) throw new Error(`LNURL callback failed (${res.status})`);

  const data = await res.json();
  if (data.status === 'ERROR') throw new Error(data.reason || 'Provider rejected invoice');
  if (!data.pr) throw new Error('Failed to get invoice from provider');

  return data.pr;
}

/** Wait for the Zap Receipt (Kind 9735) on Nostr indicating the payment was settled */
export function subscribeToZapReceipts(
  eventId: string,
  onZapReceived: (event: NostrEvent) => void
) {
  // NIP-57 says receipt is kind 9735, tag e points to the note
  const sub = pool.subscribeMany(
    RELAYS,
    { kinds: [9735], '#e': [eventId], limit: 50 },
    { onevent: onZapReceived }
  );
  return () => sub.close();
}
