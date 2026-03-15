import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';

export function createKeys() {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const nsec = nip19.nsecEncode(sk);
  const npub = nip19.npubEncode(pk);
  return { sk, pk, nsec, npub };
}

export function loginWithKey(nsec: string) {
  try {
    const { type, data } = nip19.decode(nsec);
    if (type !== 'nsec') throw new Error('Not an nsec key');
    const sk = data as Uint8Array;
    const pk = getPublicKey(sk);
    const npub = nip19.npubEncode(pk);
    return { sk, pk, nsec, npub };
  } catch {
    // Silenciar console.error para não poluir o output do Vitest com stacktraces esperados nos testes
    // console.error("Failed to decode nsec", error);
    return null;
  }
}
