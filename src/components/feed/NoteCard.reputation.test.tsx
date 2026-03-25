/**
 * Testes de reputação: ReputationBadge no NoteCard e pills no AuthorProfile.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { NoteCard, AuthorProfile } from './NoteCard';
import type { NostrEvent } from './NoteCard';
import type { Translations } from '../../i18n/translations';
import type { ReputationData } from '../../services/nostr/reputation';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSubscribeToReactions = vi.hoisted(() => vi.fn((_id: string, _cb: any) => vi.fn()));
const mockFetchProfile = vi.hoisted(() => vi.fn((_pk: string, _cb: any) => {}));
const mockFetchReputation = vi.hoisted(() => vi.fn<() => Promise<ReputationData>>());

vi.mock('../../services/nostr/nostr', () => ({
    subscribeToReactions: mockSubscribeToReactions,
    fetchProfile: mockFetchProfile,
    fetchReputation: mockFetchReputation,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sk = generateSecretKey();
const pk = getPublicKey(sk);
const myKeys = { sk, pk };

const authorSk = generateSecretKey();
const authorPk = getPublicKey(authorSk);
const authorNpub = nip19.npubEncode(authorPk);

function makeNote(overrides?: Partial<NostrEvent>): NostrEvent {
    return {
        id: 'rep-note-' + Math.random().toString(36).slice(2, 8),
        pubkey: authorPk,
        created_at: 1700000000,
        kind: 1,
        tags: [['t', 'merka-app-9f8a2b3c']],
        content: 'test content',
        ...overrides,
    };
}

const t = {
    like: 'Like', liked: 'Liked!', follow: 'Follow', following: 'Following',
    followedToast: 'Following!', unfollow: 'Unfollow', secretChat: 'Chat',
    zap: 'Zap', buy: 'Buy', sell: 'Sell', confirm: 'Confirm', cancel: 'Cancel',
    openInApp: 'Open in app', copied: 'Copied',
    repTierNew: 'New', repTierActive: 'Active', repTierVerified: 'Verified', repTierTrusted: 'Trusted',
    repFollowers: 'followers', repZapsReceived: 'zaps', repReactions: 'reactions',
    repNip05Badge: 'Verified identity (NIP-05)', repLightning: 'Accepts Lightning',
    repDisputesResolved: 'disputes resolved',
} as unknown as Translations;

function makeReputation(overrides: Partial<ReputationData> = {}): ReputationData {
    return {
        followers: 0, following: 0, nip05: false, lud16: false,
        zapCount: 0, reactionCount: 0, disputeCount: 0, tier: 'new', fetchedAt: Date.now(),
        ...overrides,
    };
}

function renderNote(profile: Record<string, string> = {}, rep?: ReputationData) {
    mockSubscribeToReactions.mockReturnValue(vi.fn());
    mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb(profile));
    mockFetchReputation.mockResolvedValue(rep ?? makeReputation());

    return render(
        <NoteCard
            note={makeNote()}
            t={t}
            myKeys={myKeys}
            likedIds={new Set()}
            followedPks={new Set()}
            onLike={vi.fn()}
            onFollow={vi.fn()}
            onUnfollow={vi.fn()}
            onOpenChat={vi.fn()}
            onOpenZap={vi.fn()}
            formatTime={() => '1h'}
            renderContent={(c) => <span>{c}</span>}
        />
    );
}

// ── ReputationBadge no NoteCard ───────────────────────────────────────────────
describe('ReputationBadge — no NoteCard header', () => {
    beforeEach(() => {
        mockSubscribeToReactions.mockReturnValue(vi.fn());
    });

    it('não deve renderizar badge para tier "new" (sem nip05, sem lud16)', async () => {
        renderNote({});
        // Wait for profile to load
        await waitFor(() => {
            const badges = document.querySelectorAll('.rep-badge');
            expect(badges.length).toBe(0);
        });
    });

    it('deve renderizar badge "verified" quando perfil tem nip05', async () => {
        renderNote({ nip05: 'alice@domain.com' });
        await waitFor(() => {
            const badge = document.querySelector('.rep-badge--verified');
            expect(badge).not.toBeNull();
        });
    });

    it('deve renderizar badge "active" quando perfil tem lud16 mas não nip05', async () => {
        renderNote({ lud16: 'alice@wallet.io' });
        await waitFor(() => {
            const badge = document.querySelector('.rep-badge--active');
            expect(badge).not.toBeNull();
        });
    });

    it('badge "trusted" tem aria-label correto', async () => {
        renderNote({ nip05: 'alice@domain.com' });
        await waitFor(() => {
            const badge = document.querySelector('[aria-label="Verified"]');
            expect(badge).not.toBeNull();
        });
    });
});

// ── Pills no AuthorProfile popup ─────────────────────────────────────────────
describe('AuthorProfile — pills de reputação', () => {
    beforeEach(() => {
        mockFetchReputation.mockReset();
        mockFetchProfile.mockReset();
    });

    function renderAuthorProfile(rep: ReputationData, profile: Record<string, string> = {}) {
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb(profile));
        mockFetchReputation.mockResolvedValue(rep);

        return render(
            <AuthorProfile
                pubkey={authorPk}
                npub={authorNpub}
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

    it('deve exibir loading bar antes de reputation carregar', () => {
        // Never resolves
        mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
        mockFetchReputation.mockReturnValue(new Promise(() => {}));

        render(
            <AuthorProfile
                pubkey={authorPk}
                npub={authorNpub}
                t={t}
                onClose={vi.fn()}
                onFollow={vi.fn()}
                onUnfollow={vi.fn()}
                onChat={vi.fn()}
                isFollowed={false}
                hasKeys={true}
            />
        );

        expect(document.querySelector('.rep-loading-bar')).not.toBeNull();
    });

    it('deve exibir pill "Verified" quando nip05=true', async () => {
        renderAuthorProfile(makeReputation({ nip05: true, tier: 'verified' }));
        await waitFor(() => {
            expect(screen.getByText(t.repTierVerified!)).toBeInTheDocument();
        });
    });

    it('deve exibir contagem de seguidores quando followers > 0', async () => {
        renderAuthorProfile(makeReputation({ followers: 42, tier: 'active' }));
        await waitFor(() => {
            expect(screen.getByText(/42/)).toBeInTheDocument();
            expect(screen.getByText(/followers/i)).toBeInTheDocument();
        });
    });

    it('deve exibir contagem de zaps quando zapCount > 0', async () => {
        renderAuthorProfile(makeReputation({ zapCount: 7, tier: 'active' }));
        // Use querySelector to avoid ambiguity: npub display may also contain "7" (bech32 charset)
        await waitFor(() => {
            const pills = Array.from(document.querySelectorAll('.about-client-pill'));
            const zapPill = pills.find(el => /zaps/i.test(el.textContent || ''));
            expect(zapPill).not.toBeNull();
            expect(zapPill!.textContent).toMatch(/7/);
        });
    });

    it('não deve exibir pill de followers quando followers === 0', async () => {
        renderAuthorProfile(makeReputation({ followers: 0, tier: 'new' }));
        await waitFor(() => {
            // reputation loaded (no loading bar)
            expect(document.querySelector('.rep-loading-bar')).toBeNull();
        });
        expect(screen.queryByText(/followers/i)).not.toBeInTheDocument();
    });

    it('deve exibir pill de reações quando reactionCount > 0', async () => {
        renderAuthorProfile(makeReputation({ reactionCount: 15, tier: 'active' }));
        await waitFor(() => {
            expect(screen.getByText(/reactions/i)).toBeInTheDocument();
        });
    });

    it('deve exibir pill de disputas quando disputeCount > 0', async () => {
        renderAuthorProfile(makeReputation({ disputeCount: 7, nip05: true, tier: 'trusted' }));
        await waitFor(() => {
            const pills = Array.from(document.querySelectorAll('.about-client-pill'));
            const disputePill = pills.find(el => /disputes/i.test(el.textContent || ''));
            expect(disputePill).not.toBeNull();
            expect(disputePill!.textContent).toMatch(/7/);
        });
    });

    it('não deve exibir pill de disputas quando disputeCount === 0', async () => {
        renderAuthorProfile(makeReputation({ disputeCount: 0, tier: 'new' }));
        await waitFor(() => {
            expect(document.querySelector('.rep-loading-bar')).toBeNull();
        });
        expect(screen.queryByText(/disputes/i)).not.toBeInTheDocument();
    });
});
