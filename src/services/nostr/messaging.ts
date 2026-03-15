import { generateSecretKey, getPublicKey, finalizeEvent, getEventHash, nip44, nip17 } from 'nostr-tools';
import type { NostrEvent, UnsignedEvent } from 'nostr-tools';

type Rumor = UnsignedEvent & { id: string };
import { pool } from './pool';
import { RELAYS } from './relayHealth';

function createSelfCopyWrap(sk: Uint8Array, recipientPubkey: string, message: string) {
  const myPubkey = getPublicKey(sk);
  const randomPast = () => Math.round(Date.now() / 1000 - Math.random() * 2 * 24 * 3600);

  const rumorBase = {
    kind: 14,
    pubkey: myPubkey,
    created_at: Math.ceil(Date.now() / 1000),
    tags: [['p', recipientPubkey]],
    content: message,
  };
  const rumor = { ...rumorBase, id: getEventHash(rumorBase as UnsignedEvent) };

  const sealConvKey = nip44.getConversationKey(sk, myPubkey);
  const seal = finalizeEvent({
    kind: 13,
    content: nip44.encrypt(JSON.stringify(rumor), sealConvKey),
    created_at: randomPast(),
    tags: [],
  }, sk);

  const wrapKey = generateSecretKey();
  const wrapConvKey = nip44.getConversationKey(wrapKey, myPubkey);
  return finalizeEvent({
    kind: 1059,
    content: nip44.encrypt(JSON.stringify(seal), wrapConvKey),
    created_at: randomPast(),
    tags: [['p', myPubkey]],
  }, wrapKey);
}

export async function publishEncryptedDM(
  sk: Uint8Array, recipientPubkey: string, message: string
) {
  const myPubkey = getPublicKey(sk);
  let events;
  try {
    const recipientWrap = nip17.wrapEvent(sk, { publicKey: recipientPubkey }, message);
    events = myPubkey === recipientPubkey
      ? [recipientWrap]
      : [createSelfCopyWrap(sk, recipientPubkey, message), recipientWrap];
  } catch (err) {
    console.error("DM wrap failed", err);
    return false;
  }
  let anySuccess = false;
  for (const event of events) {
    try {
      const pub = pool.publish(RELAYS, event);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500));
      await Promise.any(pub.map(p => Promise.race([p, timeout])));
      anySuccess = true;
    }
    catch { console.error("publishEncryptedDM failed for event"); }
  }
  return anySuccess;
}

export async function fetchDMPartners(sk: Uint8Array, since: number): Promise<string[]> {
  const myPubkey = getPublicKey(sk);
  const partners = new Set<string>();

  return new Promise<string[]>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; sub.close(); resolve(Array.from(partners)); } };
    const sub = pool.subscribeMany(
      RELAYS,
      { kinds: [1059], '#p': [myPubkey], since, limit: 200 },
      {
        onevent(ev: NostrEvent) {
          try {
            const rumor = nip17.unwrapEvent(ev, sk);
            if (rumor.pubkey !== myPubkey) {
              partners.add(rumor.pubkey);
            } else {
              const pTag = rumor.tags.find((t: string[]) => t[0] === 'p');
              if (pTag && pTag[1] !== myPubkey) {
                partners.add(pTag[1]);
              }
            }
          } catch { /* ignore undecryptable */ }
        },
        oneose: finish
      }
    );
    setTimeout(finish, 6000);
  });
}

export function subscribeToIncomingDMs(
  sk: Uint8Array,
  onEvent: (event: Rumor) => void,
  since?: number
) {
  const myPubkey = getPublicKey(sk);
  const filter = { kinds: [1059], '#p': [myPubkey], ...(since ? { since } : {}) };
  const sub = pool.subscribeMany(RELAYS, filter, {
    onevent: (ev: NostrEvent) => {
      try {
        const rumor = nip17.unwrapEvent(ev, sk);
        onEvent(rumor);
      } catch { /* ignore */ }
    }
  });
  return () => sub.close();
}

export function subscribeToConversation(
  sk: Uint8Array,
  otherPubkey: string,
  onEvent: (event: Rumor) => void
) {
  const myPubkey = getPublicKey(sk);
  const sub = pool.subscribeMany(
    RELAYS,
    { kinds: [1059], '#p': [myPubkey], limit: 100 },
    {
      onevent: (ev: NostrEvent) => {
        try {
          const rumor = nip17.unwrapEvent(ev, sk);
          const isFromOther = rumor.pubkey === otherPubkey;
          const isToOther = rumor.pubkey === myPubkey && rumor.tags.some((t: string[]) => t[0] === 'p' && t[1] === otherPubkey);
          if (isFromOther || isToOther) {
            onEvent(rumor);
          }
        } catch { /* ignore */ }
      }
    }
  );
  return () => sub.close();
}
