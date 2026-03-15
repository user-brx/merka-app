/**
 * Testes de comportamento de NoteCard e AuthorProfile.
 * Cobre: ações do usuário, segurança de URLs, lifecycle de subscriptions,
 * visibilidade de botões condicionais e lógica de nota própria vs. de terceiros.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { NoteCard, AuthorProfile } from './NoteCard';
import type { NostrEvent } from './NoteCard';
import type { Translations } from '../../i18n/translations';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSubscribeToReactions = vi.hoisted(() => vi.fn((_id: string, _cb: any) => vi.fn()));
const mockFetchProfile = vi.hoisted(() => vi.fn((_pk: string, _cb: any) => {}));
const mockSubscribeRelayStatus = vi.hoisted(() => vi.fn((_cb: any) => vi.fn()));

vi.mock('../../services/nostr/nostr', () => ({
    subscribeToReactions: mockSubscribeToReactions,
    fetchProfile: mockFetchProfile,
    subscribeRelayStatus: mockSubscribeRelayStatus,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sk = generateSecretKey();
const pk = getPublicKey(sk);
const myKeys = { sk, pk };

const authorSk = generateSecretKey();
const authorPk = getPublicKey(authorSk);

function makeNote(overrides?: Partial<NostrEvent>): NostrEvent {
    return {
        id: 'note' + Math.random().toString(36).slice(2, 8),
        pubkey: authorPk,
        created_at: 1700000000,
        kind: 1,
        tags: [['t', 'merka-app-9f8a2b3c']],
        content: JSON.stringify({ type: 'sell', msg: 'Vendo BTC', lang: 'pt' }),
        ...overrides,
    };
}

const t = {
    like: 'Curtir',
    liked: 'Curtido!',
    follow: 'Seguir',
    following: 'Seguindo',
    followedToast: 'Seguindo!',
    unfollow: 'Deixar de seguir',
    secretChat: 'Chat privado',
    zap: 'Zap',
    buy: 'Comprar',
    sell: 'Vender',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    viewProfile: 'Ver perfil',
    openInApp: 'Abrir no app',
} as unknown as Translations;

function renderNote(overrides?: {
    note?: NostrEvent;
    myKeys?: { sk: Uint8Array; pk: string } | null;
    likedIds?: Set<string>;
    followedPks?: Set<string>;
    extractNoteType?: (c: string) => 'buy' | 'sell' | null;
}) {
    const note = overrides?.note ?? makeNote();
    const onLike = vi.fn();
    const onFollow = vi.fn();
    const onUnfollow = vi.fn();
    const onOpenChat = vi.fn();
    const onOpenZap = vi.fn();

    const result = render(
        <NoteCard
            note={note}
            t={t}
            myKeys={overrides?.myKeys !== undefined ? overrides.myKeys : myKeys}
            likedIds={overrides?.likedIds ?? new Set()}
            followedPks={overrides?.followedPks ?? new Set()}
            onLike={onLike}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            onOpenChat={onOpenChat}
            onOpenZap={onOpenZap}
            formatTime={(ts) => new Date(ts * 1000).toLocaleTimeString()}
            renderContent={(c) => <span>{c}</span>}
            extractNoteType={overrides?.extractNoteType}
        />
    );

    return { ...result, onLike, onFollow, onUnfollow, onOpenChat, onOpenZap, note };
}

// ── Renderização básica ────────────────────────────────────────────────────────
describe('NoteCard — renderização', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({ display_name: 'Alice', name: 'alice' });
        });
    });

    it('deve exibir o conteúdo da nota', () => {
        const content = '{"type":"sell","msg":"BTC à venda","lang":"pt"}';
        renderNote({ note: makeNote({ content }) });
        expect(screen.getByText(content)).toBeInTheDocument();
    });

    it('deve exibir horário formatado', () => {
        renderNote({ note: makeNote({ created_at: 1700000000 }) });
        // formatTime should produce some string — just verify it's rendered
        expect(document.querySelector('.note-meta')).not.toBeNull();
    });

    it('deve exibir badge de tipo "buy" quando extractNoteType retorna buy', () => {
        renderNote({ extractNoteType: () => 'buy' });
        expect(screen.getByText(t.buy)).toBeInTheDocument();
    });

    it('deve exibir badge de tipo "sell" quando extractNoteType retorna sell', () => {
        renderNote({ extractNoteType: () => 'sell' });
        expect(screen.getByText(t.sell)).toBeInTheDocument();
    });

    it('não deve exibir badge quando extractNoteType retorna null', () => {
        renderNote({ extractNoteType: () => null });
        expect(screen.queryByText(t.buy)).not.toBeInTheDocument();
        expect(screen.queryByText(t.sell)).not.toBeInTheDocument();
    });
});

// ── Botão Like ────────────────────────────────────────────────────────────────
describe('NoteCard — botão Like', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
    });

    it('deve ter botão Like desabilitado quando não há myKeys (usuário não logado)', () => {
        renderNote({ myKeys: null });
        const likeBtn = screen.getByRole('button', { name: /Curtir/i });
        expect(likeBtn).toBeDisabled();
    });

    it('deve ter botão Like desabilitado quando nota já foi curtida', () => {
        const note = makeNote();
        renderNote({ note, likedIds: new Set([note.id]) });
        // Label stays t.like — only the CSS class becomes "liked"
        const likeBtn = screen.getByRole('button', { name: /Curtir/i });
        expect(likeBtn).toBeDisabled();
        expect(likeBtn).toHaveClass('liked');
    });

    it('deve chamar onLike ao clicar no botão Like', () => {
        const { onLike, note } = renderNote();
        fireEvent.click(screen.getByRole('button', { name: /Curtir/i }));
        expect(onLike).toHaveBeenCalledWith(note);
    });

    it('deve exibir toast "Curtido!" após clicar em Like', async () => {
        renderNote();
        fireEvent.click(screen.getByRole('button', { name: /Curtir/i }));
        await waitFor(() => {
            expect(screen.getByText(t.liked)).toBeInTheDocument();
        });
    });
});

// ── Botão Follow ──────────────────────────────────────────────────────────────
describe('NoteCard — botão Follow', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
    });

    it('deve ocultar botão Follow para notas próprias (isMe = true)', () => {
        renderNote({ note: makeNote({ pubkey: pk }) });
        expect(screen.queryByRole('button', { name: /Seguir/i })).not.toBeInTheDocument();
    });

    it('deve exibir botão Follow para notas de outros usuários', () => {
        renderNote({ note: makeNote({ pubkey: authorPk }) });
        expect(screen.getByRole('button', { name: /Seguir/i })).toBeInTheDocument();
    });

    it('deve ter botão Follow desabilitado quando usuário já é seguido', () => {
        renderNote({ followedPks: new Set([authorPk]) });
        const btn = screen.getByRole('button', { name: /Seguindo/i });
        expect(btn).toBeDisabled();
    });

    it('deve ter botão Follow desabilitado quando não há myKeys', () => {
        renderNote({ myKeys: null });
        const btn = screen.getByRole('button', { name: /Seguir/i });
        expect(btn).toBeDisabled();
    });

    it('deve chamar onFollow ao clicar em Follow', () => {
        const { onFollow } = renderNote();
        fireEvent.click(screen.getByRole('button', { name: /Seguir/i }));
        expect(onFollow).toHaveBeenCalledWith(authorPk);
    });
});

// ── Botão DM (Chat privado) ──────────────────────────────────────────────────
describe('NoteCard — botão DM', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
    });

    it('deve ocultar botão DM para notas próprias', () => {
        renderNote({ note: makeNote({ pubkey: pk }) });
        expect(screen.queryByRole('button', { name: new RegExp(t.secretChat) })).not.toBeInTheDocument();
    });

    it('deve ocultar botão DM quando não há myKeys', () => {
        renderNote({ myKeys: null });
        expect(screen.queryByRole('button', { name: new RegExp(t.secretChat) })).not.toBeInTheDocument();
    });

    it('deve exibir botão DM para notas de outros quando logado', () => {
        renderNote();
        expect(screen.getByRole('button', { name: new RegExp(t.secretChat) })).toBeInTheDocument();
    });

    it('deve chamar onOpenChat com pubkey e npub corretos ao clicar em DM', () => {
        const { onOpenChat } = renderNote();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t.secretChat) }));
        const expectedNpub = nip19.npubEncode(authorPk);
        expect(onOpenChat).toHaveBeenCalledWith(authorPk, expectedNpub);
    });
});

// ── Subscription de reações (lifecycle) ───────────────────────────────────────
describe('NoteCard — lifecycle de subscribeToReactions', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockClear();
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockClear();
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
    });

    it('deve chamar subscribeToReactions com noteId correto ao montar', () => {
        const note = makeNote({ id: 'note-fixed-id' });
        renderNote({ note });

        expect(mockSubscribeToReactions).toHaveBeenCalledOnce();
        expect(mockSubscribeToReactions.mock.calls[0][0]).toBe('note-fixed-id');
    });

    it('deve chamar cleanup de subscribeToReactions ao desmontar (sem memory leak)', () => {
        const mockUnsub = vi.fn();
        mockSubscribeToReactions.mockReturnValue(mockUnsub);

        const { unmount } = renderNote();
        expect(mockUnsub).not.toHaveBeenCalled();
        unmount();
        expect(mockUnsub).toHaveBeenCalledOnce();
    });

    it('deve incrementar contagem de likes ao receber reação "+"', async () => {
        let reactionHandler: ((ev: any) => void) | null = null;
        mockSubscribeToReactions.mockImplementation((_id: string, handler: any) => {
            reactionHandler = handler;
            return vi.fn();
        });

        renderNote();

        // Initially no like count shown (likeCount === 0 shows t.like text)
        expect(screen.getByRole('button', { name: /Curtir/i })).toBeInTheDocument();

        // Receive a reaction
        fireEvent(document, new CustomEvent('test')); // just to trigger re-render
        await waitFor(() => {
            reactionHandler!({ content: '+', kind: 7, id: 'r1', pubkey: 'someone', tags: [], created_at: 1000 });
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /1/ })).toBeInTheDocument();
        });
    });

    it('deve incrementar contagem de likes ao receber reação "❤️"', async () => {
        let reactionHandler: ((ev: any) => void) | null = null;
        mockSubscribeToReactions.mockImplementation((_id: string, handler: any) => {
            reactionHandler = handler;
            return vi.fn();
        });

        renderNote();

        await waitFor(() => {
            reactionHandler!({ content: '❤️', kind: 7, id: 'r2', pubkey: 'x', tags: [], created_at: 1000 });
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /1/ })).toBeInTheDocument();
        });
    });

    it('não deve incrementar contagem para reações desconhecidas (ex: "-")', async () => {
        let reactionHandler: ((ev: any) => void) | null = null;
        mockSubscribeToReactions.mockImplementation((_id: string, handler: any) => {
            reactionHandler = handler;
            return vi.fn();
        });

        renderNote();

        await waitFor(() => {
            reactionHandler!({ content: '-', kind: 7, id: 'r3', pubkey: 'x', tags: [], created_at: 1000 });
        });

        // Like count should remain 0 (shows t.like text, not a number)
        expect(screen.getByRole('button', { name: /Curtir/i })).toBeInTheDocument();
    });
});

// ── fetchProfile ─────────────────────────────────────────────────────────────
describe('NoteCard — fetchProfile', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockClear();
        mockSubscribeToReactions.mockReturnValue(vi.fn());
        mockFetchProfile.mockClear();
    });

    it('deve chamar fetchProfile com o pubkey do autor ao montar', () => {
        mockFetchProfile.mockImplementation(() => { /* no-op */ });
        const note = makeNote({ pubkey: authorPk });
        renderNote({ note });

        expect(mockFetchProfile).toHaveBeenCalledOnce();
        expect(mockFetchProfile.mock.calls[0][0]).toBe(authorPk);
    });

    it('deve exibir display_name do perfil quando disponível', async () => {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({ display_name: 'Alice Satoshi' });
        });

        renderNote();

        await waitFor(() => {
            expect(screen.getByText('Alice Satoshi')).toBeInTheDocument();
        });
    });

    it('deve fallback para name quando display_name não existe', async () => {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({ name: 'alice_nostr' });
        });

        renderNote();

        await waitFor(() => {
            expect(screen.getByText('alice_nostr')).toBeInTheDocument();
        });
    });

    it('deve exibir "Anon" quando perfil não tem name nem display_name', async () => {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({});
        });

        renderNote();

        await waitFor(() => {
            expect(screen.getByText('Anon')).toBeInTheDocument();
        });
    });
});

// ── AuthorProfile — segurança de URLs ────────────────────────────────────────
describe('AuthorProfile — segurança de URLs (safeUrl)', () => {
    function renderAuthorProfile(website?: string, lud16?: string) {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({ display_name: 'TestUser', website, lud16 });
        });

        return render(
            <AuthorProfile
                pubkey={authorPk}
                npub={nip19.npubEncode(authorPk)}
                t={t}
                onClose={vi.fn()}
                onFollow={vi.fn()}
                onUnfollow={vi.fn()}
                onChat={vi.fn()}
                isFollowed={false}
                hasKeys={true}
            />
        );
    }

    it('deve exibir link para website com https://', async () => {
        renderAuthorProfile('https://alice.com');
        await waitFor(() => {
            const link = screen.queryByRole('link', { name: /alice\.com/ });
            expect(link).toBeInTheDocument();
            expect((link as HTMLAnchorElement).href).toBe('https://alice.com/');
        });
    });

    it('deve exibir link para website com http://', async () => {
        renderAuthorProfile('http://alice.com');
        await waitFor(() => {
            expect(screen.getByRole('link', { name: /alice\.com/ })).toBeInTheDocument();
        });
    });

    it('[segurança] não deve renderizar link para javascript: URL', async () => {
        renderAuthorProfile('javascript:alert(1)');
        await waitFor(() => {
            expect(screen.queryByRole('link', { name: /javascript/ })).not.toBeInTheDocument();
        });
    });

    it('[segurança] não deve renderizar link para data: URL', async () => {
        renderAuthorProfile('data:text/html,<script>alert(1)</script>');
        await waitFor(() => {
            expect(screen.queryByRole('link', { name: /data:/ })).not.toBeInTheDocument();
        });
    });

    it('[segurança] não deve renderizar link para URL sem esquema', async () => {
        renderAuthorProfile('evil.com/xss');
        await waitFor(() => {
            expect(screen.queryByRole('link', { name: /evil\.com/ })).not.toBeInTheDocument();
        });
    });

    it('deve exibir lud16 (endereço Lightning) como texto simples, não link', async () => {
        renderAuthorProfile(undefined, 'user@wallet.com');
        await waitFor(() => {
            expect(screen.getByText(/user@wallet\.com/)).toBeInTheDocument();
            // lud16 should be a <span>, not an <a>
            const el = screen.getByText(/user@wallet\.com/);
            expect(el.tagName.toLowerCase()).not.toBe('a');
        });
    });
});

// ── AuthorProfile — fluxo de unfollow com confirmação ────────────────────────
describe('AuthorProfile — confirmação de unfollow', () => {
    beforeEach(() => {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
            cb({ display_name: 'Alice' });
        });
    });

    function renderFollowedAuthor() {
        const onUnfollow = vi.fn();
        const result = render(
            <AuthorProfile
                pubkey={authorPk}
                npub={nip19.npubEncode(authorPk)}
                t={t}
                onClose={vi.fn()}
                onFollow={vi.fn()}
                onUnfollow={onUnfollow}
                onChat={vi.fn()}
                isFollowed={true}
                hasKeys={true}
            />
        );
        return { ...result, onUnfollow };
    }

    it('deve exibir modal de confirmação ao clicar em "Deixar de seguir"', async () => {
        renderFollowedAuthor();
        fireEvent.click(screen.getByRole('button', { name: /Deixar de seguir/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
        });
    });

    it('deve chamar onUnfollow ao confirmar no modal', async () => {
        const { onUnfollow } = renderFollowedAuthor();
        fireEvent.click(screen.getByRole('button', { name: /Deixar de seguir/i }));

        await waitFor(() => screen.getByRole('button', { name: /Confirmar/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

        expect(onUnfollow).toHaveBeenCalledOnce();
    });

    it('não deve chamar onUnfollow ao cancelar no modal', async () => {
        const { onUnfollow } = renderFollowedAuthor();
        fireEvent.click(screen.getByRole('button', { name: /Deixar de seguir/i }));

        await waitFor(() => screen.getByRole('button', { name: /Cancelar/i }));
        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

        expect(onUnfollow).not.toHaveBeenCalled();
    });
});
