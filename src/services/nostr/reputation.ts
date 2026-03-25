import type { NostrEvent } from 'nostr-tools';
import { pool } from './pool';
import { RELAYS } from './relayHealth';

export type TrustTier = 'new' | 'active' | 'verified' | 'trusted';
export type DisputeOutcome = 'buyer' | 'seller' | 'mutual';

export interface ReputationData {
  followers: number;
  following: number;
  nip05: boolean;
  lud16: boolean;
  zapCount: number;
  reactionCount: number;
  disputeCount: number;
  tier: TrustTier;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const reputationCache = new Map<string, ReputationData>();
const pendingFetches = new Map<string, Promise<ReputationData>>();

export function computeTier(
  data: Pick<ReputationData, 'nip05' | 'lud16' | 'followers' | 'zapCount' | 'reactionCount' | 'disputeCount'>
): TrustTier {
  const { nip05, followers, zapCount, reactionCount, disputeCount } = data;
  if (nip05 && followers >= 20 && (zapCount > 0 || reactionCount >= 20)) return 'trusted';
  // Arbitros com histórico comprovado de disputas atingem 'trusted' via experiência
  if (nip05 && disputeCount >= 5) return 'trusted';
  if (nip05) return 'verified';
  if (followers >= 5 || reactionCount >= 10) return 'active';
  return 'new';
}

function countEvents(filter: object, timeoutMs: number): Promise<number> {
  return new Promise<number>((resolve) => {
    let count = 0;
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      try { sub.close(); } catch { /* ignore */ }
      resolve(count);
    };
    const sub = pool.subscribeMany(
      RELAYS,
      filter as Parameters<typeof pool.subscribeMany>[1],
      {
        onevent() { count++; },
        oneose: finish,
      }
    );
    setTimeout(finish, timeoutMs);
  });
}

/** Conta seguidores únicos (deduplicado por pubkey, igual ao fetchFollowers) */
function countUniqueFollowers(pubkey: string, timeoutMs: number): Promise<number> {
  return new Promise<number>((resolve) => {
    const seen = new Set<string>();
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      try { sub.close(); } catch { /* ignore */ }
      resolve(seen.size);
    };
    const sub = pool.subscribeMany(
      RELAYS,
      { kinds: [3], '#p': [pubkey], limit: 500 },
      {
        onevent(ev: NostrEvent) { seen.add(ev.pubkey); },
        oneose: finish,
      }
    );
    setTimeout(finish, timeoutMs);
  });
}

async function doFetchReputation(pubkey: string): Promise<ReputationData> {
  const [followers, following, zapCount, reactionCount, disputeCount] = await Promise.all([
    countUniqueFollowers(pubkey, 8000),
    countEvents({ kinds: [3], authors: [pubkey], limit: 1 }, 6000).then(() => {
      // following: fetch actual follow list count
      return new Promise<number>((resolve) => {
        let count = 0;
        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          try { sub.close(); } catch { /* ignore */ }
          resolve(count);
        };
        const sub = pool.subscribeMany(
          RELAYS,
          { kinds: [3], authors: [pubkey], limit: 1 },
          {
            onevent(ev) {
              count = ev.tags.filter((t: string[]) => t[0] === 'p' && t[1]).length;
            },
            oneose: finish,
          }
        );
        setTimeout(finish, 6000);
      });
    }),
    countEvents({ kinds: [9735], '#p': [pubkey], limit: 200 }, 6000),
    countEvents({ kinds: [7], '#p': [pubkey], limit: 300 }, 6000),
    countEvents({ kinds: [1], authors: [pubkey], '#t': ['merka-dispute'], limit: 200 }, 6000),
  ]);

  // nip05 and lud16 are derived from the profile cache if available,
  // otherwise we do a quick kind-0 fetch
  const profileData = await new Promise<{ nip05: boolean; lud16: boolean }>((resolve) => {
    let resolved = false;
    const finish = (data: { nip05: boolean; lud16: boolean }) => {
      if (resolved) return;
      resolved = true;
      try { sub.close(); } catch { /* ignore */ }
      resolve(data);
    };
    const sub = pool.subscribeMany(
      RELAYS,
      { kinds: [0], authors: [pubkey], limit: 1 },
      {
        onevent(ev) {
          try {
            const p = JSON.parse(ev.content) as Record<string, string>;
            finish({ nip05: !!(p.nip05 && p.nip05.includes('@')), lud16: !!p.lud16 });
          } catch {
            finish({ nip05: false, lud16: false });
          }
        },
        oneose: () => finish({ nip05: false, lud16: false }),
      }
    );
    setTimeout(() => finish({ nip05: false, lud16: false }), 5000);
  });

  const data: ReputationData = {
    followers,
    following,
    nip05: profileData.nip05,
    lud16: profileData.lud16,
    zapCount,
    reactionCount,
    disputeCount,
    tier: 'new',
    fetchedAt: Date.now(),
  };
  data.tier = computeTier(data);
  return data;
}

export async function fetchReputation(pubkey: string): Promise<ReputationData> {
  const cached = reputationCache.get(pubkey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const pending = pendingFetches.get(pubkey);
  if (pending) return pending;

  const promise = doFetchReputation(pubkey).then((data) => {
    reputationCache.set(pubkey, data);
    pendingFetches.delete(pubkey);
    return data;
  }).catch((err) => {
    pendingFetches.delete(pubkey);
    throw err;
  });

  pendingFetches.set(pubkey, promise);
  return promise;
}

/** Expose cache for testing */
export function _getReputationCache() {
  return reputationCache;
}

export function _clearReputationCache() {
  reputationCache.clear();
  pendingFetches.clear();
}
