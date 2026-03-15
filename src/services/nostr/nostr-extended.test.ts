/**
 * Testes estendidos — cobre as funções de nostr.ts não testadas em nostr.test.ts.
 * Este arquivo possui seu próprio mock de SimplePool + nip17.unwrapEvent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyEvent } from 'nostr-tools';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockPublish = vi.hoisted(() => vi.fn().mockReturnValue([Promise.resolve()]));
const mockSubscribeMany = vi.hoisted(() => vi.fn().mockReturnValue({ close: vi.fn() }));
const mockGet = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockUnwrapEvent = vi.hoisted(() => vi.fn());

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
        nip17: {
            ...mod.nip17,
            unwrapEvent: (...args: any[]) => mockUnwrapEvent(...args),
        },
    };
});

import {
    createKeys,
    publishProfile, publishReply, publishNip65Relays,
    subscribeToUserNotes, subscribeToFollowingNotes,
    fetchFollowers, fetchDMPartners,
    subscribeToIncomingDMs, subscribeToConversation,
    subscribeToReplies, subscribeToReactions,
    searchNostrNotes,
} from './nostr';

// ── publishProfile (NIP-01 kind:0) ──────────────────────────────────────────
describe('publishProfile', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar kind:0 com conteúdo JSON do perfil', async () => {
        const { sk } = createKeys();
        const profile = { name: 'Alice', about: 'Desenvolvedora Nostr', lud16: 'alice@wallet.com' };

        await publishProfile(sk, profile);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(0);
        expect(JSON.parse(event.content)).toEqual(profile);
    });

    it('deve ter tags vazias no kind:0 (sem tags customizadas)', async () => {
        const { sk } = createKeys();
        await publishProfile(sk, { name: 'Bob' });

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags).toHaveLength(0);
    });

    it('deve gerar assinatura criptograficamente válida no kind:0', async () => {
        const { sk } = createKeys();
        await publishProfile(sk, { name: 'ValidSig', display_name: 'Valid Signature Test' });

        const [, event] = mockPublish.mock.calls[0];
        expect(verifyEvent(event)).toBe(true);
    });

    it('deve retornar true quando ao menos um relay aceita', async () => {
        mockPublish.mockReturnValue([Promise.resolve('ok')]);
        const { sk } = createKeys();
        expect(await publishProfile(sk, { name: 'Alice' })).toBe(true);
    });

    it('deve retornar false quando todos os relays rejeitam', async () => {
        mockPublish.mockReturnValue([Promise.reject(new Error('rejected'))]);
        const { sk } = createKeys();
        expect(await publishProfile(sk, { name: 'Alice' })).toBe(false);
    });

    it('deve serializar apenas os campos fornecidos (sem undefined no JSON)', async () => {
        const { sk } = createKeys();
        await publishProfile(sk, { name: 'Bob', about: 'Bio' });

        const [, event] = mockPublish.mock.calls[0];
        const parsed = JSON.parse(event.content);
        expect(parsed.name).toBe('Bob');
        expect(parsed.about).toBe('Bio');
        expect('picture' in parsed).toBe(false);
    });

    it('deve publicar perfil com todos os campos opcionais preenchidos', async () => {
        const { sk } = createKeys();
        const fullProfile = {
            name: 'full', display_name: 'Full User',
            about: 'About me', picture: 'https://example.com/pic.jpg',
            website: 'https://example.com', nip05: 'user@example.com',
            lud16: 'user@wallet.com',
        };
        await publishProfile(sk, fullProfile);

        const [, event] = mockPublish.mock.calls[0];
        expect(JSON.parse(event.content)).toEqual(fullProfile);
    });
});

// ── publishReply (NIP-01 kind:1 reply) ──────────────────────────────────────
describe('publishReply', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar kind:1 com e-tag contendo marker "reply"', async () => {
        const { sk } = createKeys();
        const { pk: replyToPubkey } = createKeys();
        const replyToId = 'a'.repeat(64);

        await publishReply(sk, 'resposta aqui', replyToId, replyToPubkey);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(1);
        expect(event.content).toBe('resposta aqui');
        expect(event.tags).toContainEqual(['e', replyToId, '', 'reply']);
    });

    it('deve incluir p-tag do autor do post original', async () => {
        const { sk } = createKeys();
        const { pk: originalAuthor } = createKeys();
        const originalId = 'b'.repeat(64);

        await publishReply(sk, 'reply', originalId, originalAuthor);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags).toContainEqual(['p', originalAuthor]);
    });

    it('deve incluir tags extras passadas como parâmetro', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();
        const extraTags = [['t', 'merka-app-9f8a2b3c'], ['l', 'pt', 'ISO-639-1']];

        await publishReply(sk, 'content', 'id', pk, extraTags);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags).toContainEqual(['t', 'merka-app-9f8a2b3c']);
        expect(event.tags).toContainEqual(['l', 'pt', 'ISO-639-1']);
    });

    it('deve gerar assinatura criptograficamente válida', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();

        await publishReply(sk, 'signed reply', 'c'.repeat(64), pk);

        const [, event] = mockPublish.mock.calls[0];
        expect(verifyEvent(event)).toBe(true);
    });

    it('deve retornar true/false baseado na aceitação do relay', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();

        mockPublish.mockReturnValue([Promise.resolve('ok')]);
        expect(await publishReply(sk, 'ok', 'id', pk)).toBe(true);

        mockPublish.mockReturnValue([Promise.reject(new Error('fail'))]);
        expect(await publishReply(sk, 'fail', 'id', pk)).toBe(false);
    });

    it('não deve usar tags extras por padrão (sem parâmetro extra)', async () => {
        const { sk } = createKeys();
        const { pk } = createKeys();

        await publishReply(sk, 'minimal reply', 'id', pk);

        const [, event] = mockPublish.mock.calls[0];
        // Apenas as tags obrigatórias: e e p
        expect(event.tags).toHaveLength(2);
    });
});

// ── publishNip65Relays (NIP-65 kind:10002) ──────────────────────────────────
describe('publishNip65Relays', () => {
    beforeEach(() => {
        mockPublish.mockClear();
        mockPublish.mockReturnValue([Promise.resolve()]);
    });

    it('deve publicar kind:10002 com r-tags para cada relay', async () => {
        const { sk } = createKeys();
        const configs = [
            { url: 'wss://relay.damus.io', name: 'Damus' },
            { url: 'wss://nos.lol', name: 'nos.lol' },
        ];

        await publishNip65Relays(sk, configs);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(10002);
        expect(event.tags).toContainEqual(['r', 'wss://relay.damus.io']);
        expect(event.tags).toContainEqual(['r', 'wss://nos.lol']);
        expect(event.tags).toHaveLength(2);
    });

    it('deve publicar tags vazias quando lista de relays é vazia', async () => {
        const { sk } = createKeys();
        await publishNip65Relays(sk, []);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.kind).toBe(10002);
        expect(event.tags).toHaveLength(0);
    });

    it('deve ter content vazio no kind:10002', async () => {
        const { sk } = createKeys();
        await publishNip65Relays(sk, [{ url: 'wss://relay.damus.io', name: 'Damus' }]);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.content).toBe('');
    });

    it('deve gerar assinatura criptograficamente válida', async () => {
        const { sk } = createKeys();
        await publishNip65Relays(sk, [{ url: 'wss://relay.damus.io', name: 'Damus' }]);

        const [, event] = mockPublish.mock.calls[0];
        expect(verifyEvent(event)).toBe(true);
    });

    it('deve manter a ordem dos relays nas r-tags', async () => {
        const { sk } = createKeys();
        const configs = [
            { url: 'wss://first.relay', name: 'First' },
            { url: 'wss://second.relay', name: 'Second' },
            { url: 'wss://third.relay', name: 'Third' },
        ];

        await publishNip65Relays(sk, configs);

        const [, event] = mockPublish.mock.calls[0];
        expect(event.tags.map((t: string[]) => t[1])).toEqual([
            'wss://first.relay', 'wss://second.relay', 'wss://third.relay',
        ]);
    });
});

// ── subscribeToUserNotes ─────────────────────────────────────────────────────
describe('subscribeToUserNotes', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve assinar kind:1 filtrado pelo pubkey do autor', () => {
        const { pk } = createKeys();
        subscribeToUserNotes(pk, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1);
        expect(filter.authors).toContain(pk);
    });

    it('deve retornar função de cleanup que fecha subscription (sem memory leak)', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const { pk } = createKeys();
        const unsub = subscribeToUserNotes(pk, vi.fn());
        expect(mockClose).not.toHaveBeenCalled();
        unsub();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve respeitar o parâmetro since quando fornecido', () => {
        const { pk } = createKeys();
        const since = 1700000000;
        subscribeToUserNotes(pk, vi.fn(), since);

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBe(since);
    });

    it('não deve incluir since quando não fornecido', () => {
        const { pk } = createKeys();
        subscribeToUserNotes(pk, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBeUndefined();
    });

    it('deve chamar onEvent para cada nota recebida', () => {
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const { pk } = createKeys();
        subscribeToUserNotes(pk, onEvent);

        const fakeNote = { id: 'n1', pubkey: pk, content: 'hello', tags: [], kind: 1, created_at: 1000 };
        capturedCbs.onevent(fakeNote);
        expect(onEvent).toHaveBeenCalledWith(fakeNote);
    });
});

// ── subscribeToFollowingNotes ────────────────────────────────────────────────
describe('subscribeToFollowingNotes', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve retornar no-op imediatamente quando pubkeys é array vazio', () => {
        const unsub = subscribeToFollowingNotes([], vi.fn());
        expect(mockSubscribeMany).not.toHaveBeenCalled();
        expect(() => unsub()).not.toThrow();
    });

    it('deve filtrar kind:1 com tag APP_GUID quando pubkeys fornecidos', () => {
        const { pk } = createKeys();
        subscribeToFollowingNotes([pk], vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1);
        expect(filter['#t']).toContain('merka-app-9f8a2b3c');
    });

    it('deve retornar função de cleanup que fecha subscription', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const { pk } = createKeys();
        const unsub = subscribeToFollowingNotes([pk], vi.fn());
        unsub();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve respeitar o parâmetro since quando fornecido', () => {
        const { pk } = createKeys();
        const since = 1700000000;
        subscribeToFollowingNotes([pk], vi.fn(), since);

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBe(since);
    });
});

// ── fetchFollowers (NIP-02) ──────────────────────────────────────────────────
describe('fetchFollowers', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve usar filtro kind:3 com #p = targetPubkey', () => {
        const { pk: target } = createKeys();
        fetchFollowers(target);

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(3);
        expect(filter['#p']).toContain(target);
    });

    it('deve coletar pubkeys de seguidores no campo ev.pubkey', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);

        capturedCbs.onevent({ pubkey: 'follower1', tags: [] });
        capturedCbs.onevent({ pubkey: 'follower2', tags: [] });
        capturedCbs.oneose();

        const result = await promise;
        expect(result).toContain('follower1');
        expect(result).toContain('follower2');
        expect(result).toHaveLength(2);
    });

    it('deve retornar array vazio quando ninguém segue o usuário', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);
        capturedCbs.oneose();

        expect(await promise).toEqual([]);
    });

    it('deve desduplicar seguidores quando mesmo pubkey aparece em múltiplos eventos', async () => {
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);

        capturedCbs.onevent({ pubkey: 'sameFollower', tags: [] });
        capturedCbs.onevent({ pubkey: 'sameFollower', tags: [] });
        capturedCbs.oneose();

        const result = await promise;
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('sameFollower');
    });

    it('deve retornar array vazio após timeout de 8s quando relay nunca responde', async () => {
        vi.useFakeTimers();
        mockSubscribeMany.mockImplementation((_r: any, _f: any, _cbs: any) => ({ close: vi.fn() }));

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);
        vi.advanceTimersByTime(8001);

        expect(await promise).toEqual([]);
    });

    it('deve fechar subscription após EOSE (sem memory leak)', async () => {
        const mockClose = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: mockClose };
        });

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);
        capturedCbs.oneose();
        await promise;

        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('não deve resolver mais de uma vez quando tanto EOSE quanto timeout disparam', async () => {
        vi.useFakeTimers();
        const mockClose = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: mockClose };
        });

        const { pk: target } = createKeys();
        const promise = fetchFollowers(target);

        capturedCbs.oneose(); // resolve first
        vi.advanceTimersByTime(9000); // timeout fires after — should be no-op

        await promise;
        expect(mockClose).toHaveBeenCalledOnce(); // closed only once
    });
});

// ── fetchDMPartners (NIP-17) ─────────────────────────────────────────────────
describe('fetchDMPartners', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
        mockUnwrapEvent.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve assinar kind:1059 com #p = myPubkey e filtro since', () => {
        const { sk, pk } = createKeys();
        fetchDMPartners(sk, 1700000000);

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1059);
        expect(filter['#p']).toContain(pk);
        expect(filter.since).toBe(1700000000);
    });

    it('deve coletar pubkey do remetente em DMs recebidos (rumor.pubkey !== myPubkey)', async () => {
        const { sk, pk: myPk } = createKeys();
        const { pk: senderPk } = createKeys();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: senderPk,
            tags: [['p', myPk]],
            content: 'msg recebida',
        });

        const promise = fetchDMPartners(sk, 0);
        capturedCbs.onevent({ kind: 1059 });
        capturedCbs.oneose();

        expect(await promise).toContain(senderPk);
    });

    it('deve coletar p-tag do destinatário em DMs enviados (self-copy: rumor.pubkey === myPubkey)', async () => {
        const { sk, pk: myPk } = createKeys();
        const { pk: recipientPk } = createKeys();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: myPk, // self-copy
            tags: [['p', recipientPk]],
            content: 'msg enviada',
        });

        const promise = fetchDMPartners(sk, 0);
        capturedCbs.onevent({ kind: 1059 });
        capturedCbs.oneose();

        expect(await promise).toContain(recipientPk);
    });

    it('[segurança] não deve incluir o próprio pubkey na lista de parceiros de self-copy', async () => {
        const { sk, pk: myPk } = createKeys();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        // Self-copy where p-tag points to self (note-to-self edge case)
        mockUnwrapEvent.mockReturnValue({
            pubkey: myPk,
            tags: [['p', myPk]],
            content: 'nota pra mim mesmo',
        });

        const promise = fetchDMPartners(sk, 0);
        capturedCbs.onevent({ kind: 1059 });
        capturedCbs.oneose();

        expect(await promise).not.toContain(myPk);
    });

    it('deve ignorar silenciosamente eventos cujo unwrap falha (decrypt error)', async () => {
        const { sk } = createKeys();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockImplementation(() => { throw new Error('decrypt failed'); });

        const promise = fetchDMPartners(sk, 0);
        capturedCbs.onevent({ kind: 1059 }); // should not throw
        capturedCbs.oneose();

        expect(await promise).toEqual([]);
    });

    it('deve retornar array vazio após timeout de 6s', async () => {
        vi.useFakeTimers();
        const { sk } = createKeys();
        mockSubscribeMany.mockImplementation((_r: any, _f: any, _cbs: any) => ({ close: vi.fn() }));

        const promise = fetchDMPartners(sk, 0);
        vi.advanceTimersByTime(6001);

        expect(await promise).toEqual([]);
    });
});

// ── subscribeToIncomingDMs (NIP-17) ──────────────────────────────────────────
describe('subscribeToIncomingDMs', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
        mockUnwrapEvent.mockClear();
    });

    it('deve assinar kind:1059 com #p = myPubkey', () => {
        const { sk, pk } = createKeys();
        subscribeToIncomingDMs(sk, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1059);
        expect(filter['#p']).toContain(pk);
    });

    it('deve entregar rumor decodificado para onEvent após unwrap bem-sucedido', () => {
        const { sk } = createKeys();
        const onEvent = vi.fn();
        const rumor = { pubkey: 'sender', tags: [], content: 'secret msg', kind: 14, id: 'rid', created_at: 1000 };

        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue(rumor);
        subscribeToIncomingDMs(sk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).toHaveBeenCalledOnce();
        expect(onEvent).toHaveBeenCalledWith(rumor);
    });

    it('deve ignorar silenciosamente eventos com unwrap que falha', () => {
        const { sk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockImplementation(() => { throw new Error('decrypt error'); });

        subscribeToIncomingDMs(sk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('deve retornar cleanup que fecha subscription (sem memory leak)', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const { sk } = createKeys();
        const unsub = subscribeToIncomingDMs(sk, vi.fn());
        expect(mockClose).not.toHaveBeenCalled();
        unsub();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve respeitar o parâmetro since quando fornecido', () => {
        const { sk } = createKeys();
        const since = 1700000000;
        subscribeToIncomingDMs(sk, vi.fn(), since);

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBe(since);
    });

    it('não deve incluir since quando não fornecido', () => {
        const { sk } = createKeys();
        subscribeToIncomingDMs(sk, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.since).toBeUndefined();
    });
});

// ── subscribeToConversation (NIP-17 — filtro bidirecional) ───────────────────
describe('subscribeToConversation', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
        mockUnwrapEvent.mockClear();
    });

    it('deve assinar kind:1059 com #p = myPubkey', () => {
        const { sk, pk } = createKeys();
        const { pk: otherPk } = createKeys();
        subscribeToConversation(sk, otherPk, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1059);
        expect(filter['#p']).toContain(pk);
    });

    it('deve entregar mensagem vinda do outro usuário (isFromOther = true)', () => {
        const { sk } = createKeys();
        const { pk: otherPk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: otherPk, tags: [], content: 'olá!',
        });

        subscribeToConversation(sk, otherPk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).toHaveBeenCalledOnce();
    });

    it('deve entregar self-copy com p-tag = otherPubkey (isToOther = true)', () => {
        const { sk, pk: myPk } = createKeys();
        const { pk: otherPk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: myPk, // FROM me (self-copy)
            tags: [['p', otherPk]], // TO other
            content: 'minha mensagem',
        });

        subscribeToConversation(sk, otherPk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).toHaveBeenCalledOnce();
    });

    it('[regressão NIP-17] deve filtrar mensagens de terceiros', () => {
        const { sk } = createKeys();
        const { pk: otherPk } = createKeys();
        const { pk: thirdPk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: thirdPk, // NOT from other, NOT from me
            tags: [],
            content: 'spam de terceiro',
        });

        subscribeToConversation(sk, otherPk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('[regressão NIP-17] deve filtrar self-copy com p-tag apontando para usuário diferente', () => {
        const { sk, pk: myPk } = createKeys();
        const { pk: otherPk } = createKeys();
        const { pk: wrongPk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockReturnValue({
            pubkey: myPk,
            tags: [['p', wrongPk]], // p-tag aponta para outrem, não para otherPk
            content: 'conversa errada',
        });

        subscribeToConversation(sk, otherPk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('deve ignorar silenciosamente eventos com unwrap que falha', () => {
        const { sk } = createKeys();
        const { pk: otherPk } = createKeys();
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        mockUnwrapEvent.mockImplementation(() => { throw new Error('decrypt failed'); });

        subscribeToConversation(sk, otherPk, onEvent);
        capturedCbs.onevent({ kind: 1059 });

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('deve retornar cleanup que fecha subscription (sem memory leak)', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const { sk } = createKeys();
        const { pk: otherPk } = createKeys();
        const unsub = subscribeToConversation(sk, otherPk, vi.fn());
        unsub();

        expect(mockClose).toHaveBeenCalledOnce();
    });
});

// ── subscribeToReplies ───────────────────────────────────────────────────────
describe('subscribeToReplies', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve filtrar kind:1 com #e = noteId', () => {
        const noteId = 'a'.repeat(64);
        subscribeToReplies(noteId, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1);
        expect(filter['#e']).toContain(noteId);
    });

    it('deve chamar onEvent para cada reply recebido', () => {
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const noteId = 'b'.repeat(64);
        subscribeToReplies(noteId, onEvent);

        const fakeReply = { id: 'rid', pubkey: 'pk', content: 'reply', tags: [], kind: 1, created_at: 1000 };
        capturedCbs.onevent(fakeReply);

        expect(onEvent).toHaveBeenCalledWith(fakeReply);
    });

    it('deve retornar cleanup que fecha subscription (sem memory leak)', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const unsub = subscribeToReplies('noteid', vi.fn());
        unsub();

        expect(mockClose).toHaveBeenCalledOnce();
    });
});

// ── subscribeToReactions (NIP-25) ────────────────────────────────────────────
describe('subscribeToReactions', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    it('deve filtrar kind:7 com #e = noteId', () => {
        const noteId = 'c'.repeat(64);
        subscribeToReactions(noteId, vi.fn());

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(7);
        expect(filter['#e']).toContain(noteId);
    });

    it('deve chamar onEvent para cada reação recebida', () => {
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        subscribeToReactions('noteid', onEvent);

        const like = { id: 'lid', pubkey: 'pk', content: '+', tags: [], kind: 7, created_at: 1000 };
        capturedCbs.onevent(like);
        const heart = { id: 'hid', pubkey: 'pk2', content: '❤️', tags: [], kind: 7, created_at: 1001 };
        capturedCbs.onevent(heart);

        expect(onEvent).toHaveBeenCalledTimes(2);
    });

    it('deve retornar cleanup que fecha subscription (sem memory leak)', () => {
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const unsub = subscribeToReactions('noteid', vi.fn());
        expect(mockClose).not.toHaveBeenCalled();
        unsub();
        expect(mockClose).toHaveBeenCalledOnce();
    });
});

// ── searchNostrNotes (NIP-50) ────────────────────────────────────────────────
describe('searchNostrNotes', () => {
    beforeEach(() => {
        mockSubscribeMany.mockClear();
        mockSubscribeMany.mockReturnValue({ close: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve chamar onDone imediatamente e não assinar para query vazia', () => {
        const onDone = vi.fn();
        searchNostrNotes({ query: '', onEvent: vi.fn(), onDone });

        expect(onDone).toHaveBeenCalledOnce();
        expect(mockSubscribeMany).not.toHaveBeenCalled();
    });

    it('deve chamar onDone imediatamente para query com apenas espaços', () => {
        const onDone = vi.fn();
        searchNostrNotes({ query: '   ', onEvent: vi.fn(), onDone });

        expect(onDone).toHaveBeenCalledOnce();
        expect(mockSubscribeMany).not.toHaveBeenCalled();
    });

    it('deve assinar com kind:1, APP_GUID tag e search query normalizada', () => {
        searchNostrNotes({ query: '  bitcoin  ', onEvent: vi.fn(), onDone: vi.fn() });

        const [, filter] = mockSubscribeMany.mock.calls[0];
        expect(filter.kinds).toContain(1);
        expect(filter['#t']).toContain('merka-app-9f8a2b3c');
        expect(filter.search).toBe('bitcoin'); // trimmed
    });

    it('deve usar apenas os relays NIP-50 (relay.nostr.band e nostr.wine)', () => {
        searchNostrNotes({ query: 'test', onEvent: vi.fn(), onDone: vi.fn() });

        const [relays] = mockSubscribeMany.mock.calls[0];
        expect(relays).toContain('wss://relay.nostr.band');
        expect(relays).toContain('wss://nostr.wine');
        expect(relays).toHaveLength(2);
    });

    it('deve chamar onEvent para cada nota recebida', () => {
        const onEvent = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        searchNostrNotes({ query: 'test', onEvent, onDone: vi.fn() });

        const note = { id: 'nid', pubkey: 'pk', content: 'result', tags: [], kind: 1, created_at: 1000 };
        capturedCbs.onevent(note);

        expect(onEvent).toHaveBeenCalledWith(note);
    });

    it('deve chamar onDone no EOSE e fechar subscription', () => {
        const onDone = vi.fn();
        const mockClose = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: mockClose };
        });

        searchNostrNotes({ query: 'bitcoin', onEvent: vi.fn(), onDone });
        capturedCbs.oneose();

        expect(onDone).toHaveBeenCalledOnce();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve chamar onDone após timeout de 8s quando relay não responde', async () => {
        vi.useFakeTimers();
        const onDone = vi.fn();
        mockSubscribeMany.mockImplementation((_r: any, _f: any, _cbs: any) => ({ close: vi.fn() }));

        searchNostrNotes({ query: 'slow', onEvent: vi.fn(), onDone });
        expect(onDone).not.toHaveBeenCalled();

        vi.advanceTimersByTime(8001);
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('deve retornar função de cleanup que encerra a busca antecipadamente', () => {
        const onDone = vi.fn();
        const mockClose = vi.fn();
        mockSubscribeMany.mockReturnValue({ close: mockClose });

        const stop = searchNostrNotes({ query: 'bitcoin', onEvent: vi.fn(), onDone });
        stop(); // early cancellation

        expect(onDone).toHaveBeenCalledOnce();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it('deve chamar onDone apenas uma vez mesmo com múltiplos triggers (idempotência)', () => {
        const onDone = vi.fn();
        let capturedCbs: any;
        mockSubscribeMany.mockImplementation((_r: any, _f: any, cbs: any) => {
            capturedCbs = cbs;
            return { close: vi.fn() };
        });

        const stop = searchNostrNotes({ query: 'test', onEvent: vi.fn(), onDone });
        capturedCbs.oneose(); // trigger 1
        stop(); // trigger 2 — deve ser no-op

        expect(onDone).toHaveBeenCalledOnce();
    });
});
