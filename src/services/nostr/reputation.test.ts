import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeTier, fetchReputation, _clearReputationCache, _getReputationCache } from './reputation';

// ── Mock pool ─────────────────────────────────────────────────────────────────
vi.mock('./pool', () => ({
    pool: {
        subscribeMany: vi.fn(),
    },
    now: () => Math.floor(Date.now() / 1000),
}));

vi.mock('./relayHealth', () => ({
    RELAYS: ['wss://relay.test'],
}));

import { pool } from './pool';

// Helper: make pool.subscribeMany resolve immediately with a given count (for non-profile, non-dispute subscriptions)
function mockSubscribeCount(count: number, profileJson?: string) {
    vi.mocked(pool.subscribeMany).mockImplementation((_relays, filter: any, handlers: any) => {
        const f = filter as { kinds?: number[]; '#t'?: string[] };
        if (f.kinds?.includes(0) && profileJson !== undefined) {
            handlers.onevent({ content: profileJson, tags: [] });
        } else if (f['#t']?.includes('merka-dispute')) {
            // dispute events: emit 0 by default in generic mock
        } else {
            for (let i = 0; i < count; i++) {
                handlers.onevent({ tags: [['p', 'abc']] });
            }
        }
        handlers.oneose?.();
        return { close: vi.fn() };
    });
}

// ── computeTier ───────────────────────────────────────────────────────────────
describe('computeTier', () => {
    it('deve retornar "trusted" com nip05 + followers>=20 + zaps>0', () => {
        expect(computeTier({ nip05: true, lud16: true, followers: 25, zapCount: 3, reactionCount: 5, disputeCount: 0 }))
            .toBe('trusted');
    });

    it('deve retornar "trusted" com nip05 + followers>=20 + reactions>=20', () => {
        expect(computeTier({ nip05: true, lud16: false, followers: 20, zapCount: 0, reactionCount: 20, disputeCount: 0 }))
            .toBe('trusted');
    });

    it('deve retornar "trusted" com nip05 + disputeCount>=5 (caminho árbitro)', () => {
        expect(computeTier({ nip05: true, lud16: false, followers: 2, zapCount: 0, reactionCount: 0, disputeCount: 5 }))
            .toBe('trusted');
    });

    it('deve retornar "verified" com nip05 + disputeCount<5 (árbitro novo)', () => {
        expect(computeTier({ nip05: true, lud16: false, followers: 2, zapCount: 0, reactionCount: 0, disputeCount: 4 }))
            .toBe('verified');
    });

    it('deve retornar "verified" apenas com nip05 (sem followers suficientes)', () => {
        expect(computeTier({ nip05: true, lud16: false, followers: 3, zapCount: 0, reactionCount: 0, disputeCount: 0 }))
            .toBe('verified');
    });

    it('deve retornar "verified" com nip05 + followers>=20 mas sem zaps/reactions/disputes', () => {
        expect(computeTier({ nip05: true, lud16: false, followers: 20, zapCount: 0, reactionCount: 0, disputeCount: 0 }))
            .toBe('verified');
    });

    it('deve retornar "active" com followers>=5 sem nip05', () => {
        expect(computeTier({ nip05: false, lud16: false, followers: 5, zapCount: 0, reactionCount: 0, disputeCount: 0 }))
            .toBe('active');
    });

    it('deve retornar "active" com reactionCount>=10 sem nip05', () => {
        expect(computeTier({ nip05: false, lud16: false, followers: 2, zapCount: 0, reactionCount: 10, disputeCount: 0 }))
            .toBe('active');
    });

    it('deve retornar "new" com todos os dados zerados', () => {
        expect(computeTier({ nip05: false, lud16: false, followers: 0, zapCount: 0, reactionCount: 0, disputeCount: 0 }))
            .toBe('new');
    });

    it('deve retornar "new" com followers<5 e reactions<10 e sem nip05', () => {
        expect(computeTier({ nip05: false, lud16: false, followers: 4, zapCount: 0, reactionCount: 9, disputeCount: 0 }))
            .toBe('new');
    });

    it('disputeCount sem nip05 não muda tier para "trusted"', () => {
        expect(computeTier({ nip05: false, lud16: false, followers: 0, zapCount: 0, reactionCount: 0, disputeCount: 10 }))
            .toBe('new');
    });
});

// ── fetchReputation — edge cases ──────────────────────────────────────────────
describe('fetchReputation — edge cases', () => {
    beforeEach(() => {
        _clearReputationCache();
        vi.mocked(pool.subscribeMany).mockReset();
    });

    it('deve retornar nip05=false quando profile content é JSON inválido (catch branch)', async () => {
        vi.mocked(pool.subscribeMany).mockImplementation((_relays, filter: any, handlers: any) => {
            const f = filter as { kinds?: number[] };
            if (f.kinds?.includes(0)) {
                // Emit malformed JSON to trigger catch on line 104
                handlers.onevent({ content: 'not-valid-json{{{', tags: [] });
            }
            handlers.oneose?.();
            return { close: vi.fn() };
        });

        const rep = await fetchReputation('pubkey-bad-json');
        expect(rep.nip05).toBe(false);
        expect(rep.lud16).toBe(false);
    });

    it('deve limpar pendingFetches e re-lançar erro quando doFetchReputation falha', async () => {
        vi.mocked(pool.subscribeMany).mockImplementation(() => {
            throw new Error('relay unavailable');
        });

        await expect(fetchReputation('pubkey-error')).rejects.toThrow('relay unavailable');

        // Cache should NOT contain the errored pubkey (pendingFetches cleaned up)
        const cache = _getReputationCache();
        expect(cache.has('pubkey-error')).toBe(false);
    });

    it('deve deduplicar requisições concorrentes com mesmo pubkey', async () => {
        let resolveFirst!: () => void;
        const firstCallDone = new Promise<void>(res => { resolveFirst = res; });

        vi.mocked(pool.subscribeMany).mockImplementation((_relays, filter: any, handlers: any) => {
            const f = filter as { kinds?: number[] };
            if (f.kinds?.includes(0)) {
                firstCallDone.then(() => {
                    handlers.onevent({ content: '{}', tags: [] });
                    handlers.oneose?.();
                });
            } else {
                handlers.oneose?.();
            }
            return { close: vi.fn() };
        });

        // Fire two concurrent fetches before the first resolves
        const p1 = fetchReputation('pubkey-concurrent');
        const p2 = fetchReputation('pubkey-concurrent');

        resolveFirst();
        const [r1, r2] = await Promise.all([p1, p2]);

        // Both should be the same object (deduplication via pendingFetches)
        expect(r1).toBe(r2);
        // subscribeMany called once for kind-0 (profile), not twice
        const kind0Calls = vi.mocked(pool.subscribeMany).mock.calls.filter(
            c => (c[1] as any).kinds?.includes(0)
        );
        expect(kind0Calls.length).toBe(1);
    });
});

// ── fetchReputation — cache ───────────────────────────────────────────────────
describe('fetchReputation — cache', () => {
    beforeEach(() => {
        _clearReputationCache();
        vi.mocked(pool.subscribeMany).mockReset();
    });

    it('deve buscar do relay na primeira chamada', async () => {
        mockSubscribeCount(3, JSON.stringify({ nip05: 'alice@example.com', lud16: 'alice@wallet.com' }));

        await fetchReputation('pubkey-abc');

        expect(pool.subscribeMany).toHaveBeenCalled();
    });

    it('segunda chamada com mesmo pubkey retorna do cache sem nova requisição', async () => {
        mockSubscribeCount(2, JSON.stringify({}));

        await fetchReputation('pubkey-cache');
        const callCountAfterFirst = vi.mocked(pool.subscribeMany).mock.calls.length;

        await fetchReputation('pubkey-cache');
        const callCountAfterSecond = vi.mocked(pool.subscribeMany).mock.calls.length;

        expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });

    it('deve fazer nova requisição após TTL expirado', async () => {
        mockSubscribeCount(1, JSON.stringify({}));

        await fetchReputation('pubkey-ttl');
        const callCountAfterFirst = vi.mocked(pool.subscribeMany).mock.calls.length;

        // Manipulate fetchedAt to simulate TTL expiry (6 minutes ago)
        const cache = _getReputationCache();
        const entry = cache.get('pubkey-ttl');
        if (entry) {
            entry.fetchedAt = Date.now() - 6 * 60 * 1000;
        }

        await fetchReputation('pubkey-ttl');
        const callCountAfterSecond = vi.mocked(pool.subscribeMany).mock.calls.length;

        expect(callCountAfterSecond).toBeGreaterThan(callCountAfterFirst);
    });

    it('deve retornar tier correto baseado nos dados do relay', async () => {
        // Simulate: nip05 verified profile, 25 followers, 5 zaps, 0 reactions, 0 disputes
        vi.mocked(pool.subscribeMany).mockImplementation((_relays, filter: any, handlers: any) => {
            const f = filter as { kinds?: number[]; authors?: string[]; '#t'?: string[] };
            if (f.kinds?.includes(0)) {
                handlers.onevent({ content: JSON.stringify({ nip05: 'alice@domain.com', lud16: 'alice@wallet.io' }), tags: [] });
            } else if (f.kinds?.includes(3) && f.authors) {
                handlers.onevent({ tags: [['p', 'x1'], ['p', 'x2'], ['p', 'x3']] });
            } else if (f.kinds?.includes(3)) {
                for (let i = 0; i < 25; i++) handlers.onevent({ tags: [] });
            } else if (f.kinds?.includes(9735)) {
                for (let i = 0; i < 5; i++) handlers.onevent({ tags: [] });
            } else if (f.kinds?.includes(7)) {
                for (let i = 0; i < 2; i++) handlers.onevent({ tags: [] });
            } else if (f['#t']?.includes('merka-dispute')) {
                // no disputes
            }
            handlers.oneose?.();
            return { close: vi.fn() };
        });

        const rep = await fetchReputation('pubkey-trusted');
        expect(rep.tier).toBe('trusted');
        expect(rep.nip05).toBe(true);
        expect(rep.lud16).toBe(true);
        expect(rep.zapCount).toBe(5);
        expect(rep.disputeCount).toBe(0);
    });

    it('árbitro com nip05 + 5 disputas deve atingir tier "trusted"', async () => {
        vi.mocked(pool.subscribeMany).mockImplementation((_relays, filter: any, handlers: any) => {
            const f = filter as { kinds?: number[]; authors?: string[]; '#t'?: string[] };
            if (f.kinds?.includes(0)) {
                handlers.onevent({ content: JSON.stringify({ nip05: 'arbiter@escrow.io' }), tags: [] });
            } else if (f.kinds?.includes(3) && f.authors) {
                handlers.onevent({ tags: [] }); // 0 following
            } else if (f.kinds?.includes(3)) {
                for (let i = 0; i < 3; i++) handlers.onevent({ tags: [] }); // 3 followers (< 20)
            } else if (f.kinds?.includes(9735)) {
                // no zaps
            } else if (f.kinds?.includes(7)) {
                // no reactions
            } else if (f['#t']?.includes('merka-dispute')) {
                for (let i = 0; i < 5; i++) handlers.onevent({ tags: [] }); // 5 disputes
            }
            handlers.oneose?.();
            return { close: vi.fn() };
        });

        const rep = await fetchReputation('pubkey-arbiter');
        expect(rep.disputeCount).toBe(5);
        expect(rep.tier).toBe('trusted');
    });

    it('fetchReputation inclui disputeCount=0 quando não há disputas', async () => {
        mockSubscribeCount(0, JSON.stringify({}));
        const rep = await fetchReputation('pubkey-no-disputes');
        expect(rep.disputeCount).toBe(0);
    });
});
