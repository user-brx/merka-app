import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyEvent } from 'nostr-tools';

// ── Hoisted mocks (vi.mock é hoistado, variáveis precisam de vi.hoisted) ───
const mockPublish = vi.hoisted(() => vi.fn().mockReturnValue([Promise.resolve()]));
const mockGet = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockSubscribeMany = vi.hoisted(() => vi.fn().mockReturnValue({ close: vi.fn() }));

vi.mock('nostr-tools', async (importOriginal) => {
    const mod = await importOriginal<typeof import('nostr-tools')>();
    return {
        ...mod,
        SimplePool: vi.fn().mockImplementation(function () {
            return {
                publish: (...args: any[]) => mockPublish(...args),
                subscribeMany: (...args: any[]) => mockSubscribeMany(...args),
                get: (...args: any[]) => mockGet(...args),
            };
        }),
    };
});

// Imports AFTER mock setup
import {
    createKeys, loginWithKey,
    publishNote, publishReaction, publishFollowList,
    fetchNotesBatch, fetchNip65Relays, fetchFollowList,
    subscribeToNotes, publishEncryptedDM,
} from './nostr';

// ── createKeys ─────────────────────────────────────────────────────────────
describe('createKeys', () => {
    it('deve gerar chaves com formatos corretos', () => {
        const keys = createKeys();
        expect(keys.sk).toBeInstanceOf(Uint8Array);
        expect(keys.sk.length).toBe(32);
        expect(keys.pk).toMatch(/^[0-9a-f]{64}$/);
        expect(keys.nsec.startsWith('nsec1')).toBe(true);
        expect(keys.npub.startsWith('npub1')).toBe(true);
    });

    it('deve gerar chaves únicas a cada chamada', () => {
        const a = createKeys();
        const b = createKeys();
        expect(a.pk).not.toBe(b.pk);
        expect(a.nsec).not.toBe(b.nsec);
    });
});

// ── loginWithKey ────────────────────────────────────────────────────────────
describe('loginWithKey', () => {
    it('deve recuperar a mesma chave pública a partir do nsec', () => {
        const original = createKeys();
        const recovered = loginWithKey(original.nsec);
        expect(recovered).not.toBeNull();
        expect(recovered!.pk).toBe(original.pk);
        expect(recovered!.npub).toBe(original.npub);
    });

    it('deve retornar null para chaves inválidas', () => {
        expect(loginWithKey('not-a-valid-key')).toBeNull();
        expect(loginWithKey('')).toBeNull();
        expect(loginWithKey('npub1abc')).toBeNull(); // npub, não nsec
    });
});

// ── publishNote ─────────────────────────────────────────────────────────────
describe('publishNote', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar um evento kind:1 com o conteúdo correto', async () => {
        const { sk } = createKeys();
        await publishNote(sk, 'hello world');

        expect(mockPublish).toHaveBeenCalledOnce();
        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(1);
        expect(event.content).toBe('hello world');
    });

    it('deve incluir tags customizadas no evento', async () => {
        const { sk } = createKeys();
        await publishNote(sk, 'post', [['t', 'merka-app-9f8a2b3c'], ['l', 'pt', 'ISO-639-1']]);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags).toContainEqual(['t', 'merka-app-9f8a2b3c']);
        expect(event.tags).toContainEqual(['l', 'pt', 'ISO-639-1']);
    });

    it('deve gerar uma assinatura criptograficamente válida', async () => {
        const { sk } = createKeys();
        await publishNote(sk, 'evento assinado');

        const [, event] = mockPublish.mock.calls[0];
        expect(verifyEvent(event)).toBe(true);
    });

    it('deve retornar true quando ao menos um relay aceita', async () => {
        mockPublish.mockReturnValue([Promise.resolve('ok')]);
        const { sk } = createKeys();
        expect(await publishNote(sk, 'test')).toBe(true);
    });

    it('deve retornar false quando todos os relays rejeitam', async () => {
        mockPublish.mockReturnValue([Promise.reject(new Error('relay refused'))]);
        const { sk } = createKeys();
        expect(await publishNote(sk, 'test')).toBe(false);
    });
});

// ── publishReaction (NIP-25) ────────────────────────────────────────────────
describe('publishReaction', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar kind:7 com tags e e p corretas', async () => {
        const { sk } = createKeys();
        const { pk: notePubkey } = createKeys();
        const noteId = 'a'.repeat(64);

        await publishReaction(sk, noteId, notePubkey);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(7);
        expect(event.tags).toContainEqual(['e', noteId]);
        expect(event.tags).toContainEqual(['p', notePubkey]);
    });

    it('deve usar + como reação padrão', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();
        await publishReaction(sk, 'id', pk);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.content).toBe('+');
    });

    it('deve aceitar emoji customizado como reação', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();
        await publishReaction(sk, 'id', pk, '❤️');

        const [, event] = mockPublish.mock.calls[0];
        expect(event.content).toBe('❤️');
    });

    it('deve gerar assinatura válida no evento de reação', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();
        await publishReaction(sk, 'b'.repeat(64), pk);

        const [, event] = mockPublish.mock.calls[0];
        expect(verifyEvent(event)).toBe(true);
    });
});

// ── publishFollowList (NIP-02) ───────────────────────────────────────────────
describe('publishFollowList', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar kind:3 com p-tags para cada seguido', async () => {
        const { sk } = createKeys();
        await publishFollowList(sk, ['pk1', 'pk2', 'pk3']);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(3);
        expect(event.tags).toHaveLength(3);
        expect(event.tags).toContainEqual(['p', 'pk1']);
        expect(event.tags).toContainEqual(['p', 'pk2']);
        expect(event.tags).toContainEqual(['p', 'pk3']);
    });

    it('deve publicar tags vazias ao deixar de seguir todos', async () => {
        const { sk } = createKeys();
        await publishFollowList(sk, []);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(3);
        expect(event.tags).toHaveLength(0);
    });

    it('deve manter a ordem dos pubkeys nas tags', async () => {
        const { sk } = createKeys();
        const pubkeys = ['aaa', 'bbb', 'ccc'];
        await publishFollowList(sk, pubkeys);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags.map((t: string[]) => t[1])).toEqual(pubkeys);
    });
});

// ── fetchNip65Relays (NIP-65) — testes de segurança e regressão ─────────────
describe('fetchNip65Relays', () => {
    beforeEach(() => {
        mockGet.mockClear();
        mockGet.mockResolvedValue(null);
    });

    it('deve retornar null quando relay não tem evento kind:10002', async () => {
        expect(await fetchNip65Relays('mypubkey')).toBeNull();
    });

    it('deve extrair URLs wss:// válidas', async () => {
        mockGet.mockResolvedValue({
            tags: [['r', 'wss://relay.damus.io'], ['r', 'wss://nos.lol']],
        });
        const result = await fetchNip65Relays('mypubkey');
        expect(result).toHaveLength(2);
        expect(result!.map(r => r.url)).toEqual(['wss://relay.damus.io', 'wss://nos.lol']);
    });

    it('[segurança] deve rejeitar ws:// (WebSocket sem TLS)', async () => {
        mockGet.mockResolvedValue({
            tags: [['r', 'ws://insecure.relay.com'], ['r', 'wss://safe.relay.com']],
        });
        const result = await fetchNip65Relays('mypubkey');
        expect(result).toHaveLength(1);
        expect(result![0].url).toBe('wss://safe.relay.com');
    });

    it('[segurança] deve rejeitar http://, https:// e javascript: em URLs de relay', async () => {
        mockGet.mockResolvedValue({
            tags: [
                ['r', 'http://tracking.com'],
                ['r', 'https://not-a-relay.com'],
                ['r', 'javascript:alert(1)'],
                ['r', 'wss://legit.relay.com'],
            ],
        });
        const result = await fetchNip65Relays('mypubkey');
        expect(result).toHaveLength(1);
        expect(result![0].url).toBe('wss://legit.relay.com');
    });

    it('deve retornar null quando todas as URLs são inválidas', async () => {
        mockGet.mockResolvedValue({
            tags: [['r', 'ws://a.com'], ['r', 'http://b.com'], ['r', 'ftp://c.com']],
        });
        expect(await fetchNip65Relays('mypubkey')).toBeNull();
    });

    it('deve desduplicar URLs idênticas', async () => {
        mockGet.mockResolvedValue({
            tags: [
                ['r', 'wss://relay.damus.io'],
                ['r', 'wss://relay.damus.io'],
                ['r', 'wss://relay.damus.io'],
            ],
        });
        const result = await fetchNip65Relays('mypubkey');
        expect(result).toHaveLength(1);
    });

    it('deve derivar o nome do relay removendo o prefixo wss://', async () => {
        mockGet.mockResolvedValue({ tags: [['r', 'wss://relay.damus.io']] });
        const result = await fetchNip65Relays('mypubkey');
        expect(result![0].name).toBe('relay.damus.io');
    });

    it('deve retornar null quando pool.get lança exceção', async () => {
        mockGet.mockRejectedValue(new Error('network error'));
        expect(await fetchNip65Relays('mypubkey')).toBeNull();
    });

    it('deve ignorar tags que não sejam r', async () => {
        mockGet.mockResolvedValue({
            tags: [
                ['p', 'wss://not-a-relay.com'],
                ['e', 'wss://also-not-relay.com'],
                ['r', 'wss://real.relay.com'],
            ],
        });
        const result = await fetchNip65Relays('mypubkey');
        expect(result).toHaveLength(1);
        expect(result![0].url).toBe('wss://real.relay.com');
    });
});

// ── fetchNotesBatch ─────────────────────────────────────────────────────────
describe('fetchNotesBatch', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve chamar subscribeMany com os filtros since/until corretos', () => {
        const since = 1700000000;
        const until = 1700086400;
        fetchNotesBatch({ since, until, onEvent: vi.fn(), onDone: vi.fn() });

        expect(mockSubscribeMany).toHaveBeenCalledOnce();
        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBe(since);
        expect(filter.until).toBe(until);
        expect(filter.kinds).toContain(1);
    });

    it('deve incluir filtro de authors quando fornecido', () => {
        const authors = ['pubkey1', 'pubkey2'];
        fetchNotesBatch({ since: 0, until: 1, authors, onEvent: vi.fn(), onDone: vi.fn() });

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.authors).toEqual(authors);
    });

    it('não deve incluir authors quando não fornecido', () => {
        fetchNotesBatch({ since: 0, until: 1, onEvent: vi.fn(), onDone: vi.fn() });

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.authors).toBeUndefined();
    });

    it('deve chamar onEvent para cada evento recebido', () => {
        const onEvent = vi.fn();
        let capturedCallbacks: any;
        mockSubscribeMany.mockImplementation((_relays: any, _filter: any, callbacks: any) => {
            capturedCallbacks = callbacks;
            return { close: vi.fn() };
        });

        fetchNotesBatch({ since: 0, until: 1, onEvent, onDone: vi.fn() });

        const fakeEvent = { id: 'abc', pubkey: 'pk', content: 'hello', tags: [], kind: 1, created_at: 100 };
        capturedCallbacks.onevent(fakeEvent);
        capturedCallbacks.onevent(fakeEvent);

        expect(onEvent).toHaveBeenCalledTimes(2);
        expect(onEvent).toHaveBeenCalledWith(fakeEvent);
    });

    it('deve chamar onDone ao receber EOSE', () => {
        const onDone = vi.fn();
        let capturedCallbacks: any;
        mockSubscribeMany.mockImplementation((_relays: any, _filter: any, callbacks: any) => {
            capturedCallbacks = callbacks;
            return { close: vi.fn() };
        });

        fetchNotesBatch({ since: 0, until: 1, onEvent: vi.fn(), onDone });

        expect(onDone).not.toHaveBeenCalled();
        capturedCallbacks.oneose();
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('deve fechar a subscription no EOSE (sem memory leak)', () => {
        const mockClose = vi.fn();
        let capturedCallbacks: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCallbacks = cbs;
            return { close: mockClose };
        });

        fetchNotesBatch({ since: 0, until: 1, onEvent: vi.fn(), onDone: vi.fn() });
        expect(mockClose).not.toHaveBeenCalled();
        capturedCallbacks.oneose();
        expect(mockClose).toHaveBeenCalledOnce();
    });
});

// ── subscribeToNotes — ciclo de vida da subscription ───────────────────────
describe('subscribeToNotes', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve assinar eventos kind:1 filtrados pela tag APP_GUID', () => {
        subscribeToNotes(vi.fn());
        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1);
        expect(filter['#t']).toContain('merka-app-9f8a2b3c');
    });

    it('deve retornar função de cleanup que fecha a subscription', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const unsub = subscribeToNotes(vi.fn());
        expect(mockClose).not.toHaveBeenCalled();
        unsub();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve respeitar o parâmetro since quando fornecido', () => {
        const since = 1700000000;
        subscribeToNotes(vi.fn(), since);
        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBe(since);
    });
});

// ── fetchFollowList (NIP-02) ─────────────────────────────────────────────────
describe('fetchFollowList', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve extrair pubkeys das p-tags do evento kind:3', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r, _f, cbs) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const promise = fetchFollowList('myPubkey');
        capturedCbs.onevent({
            created_at: 1000,
            tags: [['p', 'pk1'], ['p', 'pk2'], ['e', 'ignored'], ['p', 'pk3']],
        });
        capturedCbs.oneose();

        expect(await promise).toEqual(['pk1', 'pk2', 'pk3']);
    });

    it('deve retornar [] quando kind:3 não tem p-tags (usuário não segue ninguém)', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r, _f, cbs) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const promise = fetchFollowList('myPubkey');
        capturedCbs.onevent({ created_at: 1000, tags: [['e', 'something']] });
        capturedCbs.oneose();

        expect(await promise).toEqual([]);
    });

    it('deve retornar null quando relay envia EOSE sem kind:3', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r, _f, cbs) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const promise = fetchFollowList('myPubkey');
        capturedCbs.oneose(); // EOSE sem nenhum evento

        expect(await promise).toBeNull();
    });

    it('deve usar o evento mais recente quando múltiplos kind:3 chegam', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r, _f, cbs) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const promise = fetchFollowList('myPubkey');
        capturedCbs.onevent({ created_at: 1000, tags: [['p', 'old-pk']] });
        capturedCbs.onevent({ created_at: 2000, tags: [['p', 'new-pk']] });
        capturedCbs.onevent({ created_at: 1500, tags: [['p', 'mid-pk']] });
        capturedCbs.oneose();

        expect(await promise).toEqual(['new-pk']);
    });

    it('deve retornar null após timeout quando relay nunca responde', async () => {
        vi.useFakeTimers();
        mockSubscribeMany.mockImplementation((_r, _f, _cbs) => ({ close: vi.fn() }));

        const promise = fetchFollowList('myPubkey');
        vi.advanceTimersByTime(6001);

        expect(await promise).toBeNull();
    });

    it('deve fechar a subscription após resolver', async () => {
        const mockClose = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r, _f, cbs) => {
            capturedCbs = cbs;
            return { close: mockClose };
        });

        const promise = fetchFollowList('myPubkey');
        capturedCbs.oneose();
        await promise;

        expect(mockClose).toHaveBeenCalledOnce();
    });
});

// ── publishEncryptedDM (NIP-17 gift-wrap) ───────────────────────────────────
describe('publishEncryptedDM', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar 2 eventos quando remetente != destinatário (self-copy + recipient wrap)', async () => {
        const sender = createKeys();
        const recipient = createKeys();
        await publishEncryptedDM(sender.sk, recipient.pk, 'hello');
        expect(mockPublish).toHaveBeenCalledTimes(2);
    });

    it('deve publicar apenas 1 evento ao enviar para si mesmo', async () => {
        const sender = createKeys();
        await publishEncryptedDM(sender.sk, sender.pk, 'note to self');
        expect(mockPublish).toHaveBeenCalledTimes(1);
    });

    it('deve empacotar todos os eventos como kind:1059 (gift wrap)', async () => {
        const sender = createKeys();
        const recipient = createKeys();
        await publishEncryptedDM(sender.sk, recipient.pk, 'secret message');

        for (const [, event] of mockPublish.mock.calls) {
            expect(event.kind).toBe(1059);
        }
    });

    it('deve retornar true quando ao menos um relay aceita', async () => {
        mockPublish.mockReturnValue([Promise.resolve('ok')]);
        const sender = createKeys();
        const recipient = createKeys();
        expect(await publishEncryptedDM(sender.sk, recipient.pk, 'hello')).toBe(true);
    });

    it('deve retornar false quando todos os relays rejeitam todos os eventos', async () => {
        mockPublish.mockReturnValue([Promise.reject(new Error('rejected'))]);
        const sender = createKeys();
        const recipient = createKeys();
        expect(await publishEncryptedDM(sender.sk, recipient.pk, 'hello')).toBe(false);
    });

    it('deve produzir gift wraps com assinaturas válidas', async () => {
        const sender = createKeys();
        const recipient = createKeys();
        await publishEncryptedDM(sender.sk, recipient.pk, 'verify me');

        for (const [, event] of mockPublish.mock.calls) {
            expect(verifyEvent(event)).toBe(true);
        }
    });
});

// ── #Merka tag filter (lógica de filtragem) ──────────────────────────
describe('hasMerkaTag filter', () => {
    const hasMerkaTag = (tags: string[][]) => {
        return tags.some(tag => tag[0] === 't' && tag[1] === 'merka-app-9f8a2b3c');
    };

    it('deve retornar true para notas com a tag APP_GUID', () => {
        expect(hasMerkaTag([['t', 'merka-app-9f8a2b3c']])).toBe(true);
        expect(hasMerkaTag([['e', 'someid'], ['t', 'merka-app-9f8a2b3c'], ['p', 'pk']])).toBe(true);
    });

    it('deve retornar false para notas sem a tag APP_GUID', () => {
        expect(hasMerkaTag([])).toBe(false);
        expect(hasMerkaTag([['t', 'Merka']])).toBe(false);
        expect(hasMerkaTag([['t', 'OtherTag']])).toBe(false);
        expect(hasMerkaTag([['e', 'merka-app-9f8a2b3c']])).toBe(false); // prefixo errado
    });
});
