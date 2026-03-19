import { useState, useEffect } from 'react';
import type { Translations } from '../../../i18n/translations';
import { useDragToClose } from '../../../hooks/useDragToClose';
import { nip19 } from 'nostr-tools';
import { fetchFollowers, fetchProfile, searchNostrProfiles } from '../../../services/nostr/nostr';
import { AuthorProfile } from '../../feed/NoteCard';
import { XIcon, UsersIcon } from '../../ui/icons';

interface NetworkListModalProps {
    t: Translations;
    followedPks: Set<string>;
    onClose: () => void;
    myKeys: { sk: Uint8Array; pk: string; nsec: string; npub: string } | null;
    onFollow: (pubkey: string) => void;
    onUnfollow: (pubkey: string) => void;
    onOpenChat: (pubkey: string, npub: string) => void;
    onOpenZap: (pubkey: string, npub: string, noteId?: string, lud16?: string) => void;
}

export function NetworkListModal({ t, followedPks, onClose, myKeys, onFollow, onUnfollow, onOpenChat, onOpenZap }: NetworkListModalProps) {
    const dragProps = useDragToClose(onClose);
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>('following');
    const [followersPks, setFollowersPks] = useState<string[]>([]);
    const [loadingFollowers, setLoadingFollowers] = useState(true);

    // Search state
    const [searchInput, setSearchInput] = useState('');
    const [searchPk, setSearchPk] = useState<string | null>(null);
    const [searchNotFound, setSearchNotFound] = useState(false);
    const [relaySearchPks, setRelaySearchPks] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Profiles cache — populated as rows load, used for text filtering
    const [profiles, setProfiles] = useState<Record<string, Record<string, string>>>({});

    // Filter out self from following
    const followingPks = Array.from(followedPks).filter(pk => pk !== myKeys?.pk);

    useEffect(() => {
        if (!myKeys?.pk) return;
        fetchFollowers(myKeys.pk).then(pks => {
            const noSelf = pks.filter(pk => pk !== myKeys.pk);
            setFollowersPks(noSelf);
            setLoadingFollowers(false);
        });
    }, [myKeys?.pk]);

    const displayPks = activeTab === 'followers' ? followersPks : followingPks;

    // Dual-mode search: npub/hex → relay lookup | plain text → local + relay search
    const raw = searchInput.trim();
    const isKeySearch = raw.startsWith('npub1') || /^[0-9a-f]{64}$/i.test(raw);
    const isTextSearch = raw.length >= 2 && !isKeySearch;

    // Relay-wide profile search when text search is active
    useEffect(() => {
        if (!isTextSearch) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRelaySearchPks([]);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const stop = searchNostrProfiles(
            raw,
            (pk, data) => {
                setProfiles(prev => ({ ...prev, [pk]: data }));
                setRelaySearchPks(prev => prev.includes(pk) ? prev : [...prev, pk]);
            },
            () => setIsSearching(false)
        );
        return () => stop();
    }, [raw, isTextSearch]);

    const localMatchPks = isTextSearch
        ? displayPks.filter(pk => {
            const p = profiles[pk];
            if (!p) return false; // profile not yet loaded — hide until known
            const haystack = [p.name, p.display_name, p.nip05, p.about]
                .filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(raw.toLowerCase());
        })
        : displayPks;

    // Merge local matches + relay results (deduped), keeping local results first
    const filteredDisplayPks = isTextSearch
        ? [...new Set([...localMatchPks, ...relaySearchPks])]
        : displayPks;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!raw || isTextSearch) return; // text search is live — no submit needed

        setSearchNotFound(false);
        setSearchPk(null);

        let pk: string | null = null;
        try {
            if (raw.startsWith('npub1')) {
                const decoded = nip19.decode(raw);
                if (decoded.type === 'npub') pk = decoded.data as string;
            } else if (/^[0-9a-f]{64}$/i.test(raw)) {
                pk = raw.toLowerCase();
            }
        } catch {
            pk = null;
        }

        if (!pk) {
            setSearchNotFound(true);
            return;
        }

        setSearchPk(pk);
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearchPk(null);
        setSearchNotFound(false);
    };

    const tabCount = (tab: 'followers' | 'following') => {
        const base = tab === 'followers' ? followersPks.length : followingPks.length;
        if (isTextSearch && tab === activeTab) return filteredDisplayPks.length;
        return base;
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 50 }}>
            <div className="modal-box" onClick={e => e.stopPropagation()} {...dragProps} style={{ maxWidth: 'min(420px, 100%)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80dvh' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.2rem 0.6rem 1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div className="modal-header-icon icon-network"><UsersIcon size={18} /></div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{t.networkTitle || 'Network'}</h3>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem' }}><XIcon /></button>
                </div>

                {/* Search bar */}
                <div style={{ padding: '0 1.2rem 0.8rem 1.2rem' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => { setSearchInput(e.target.value); setSearchNotFound(false); if (!e.target.value.trim()) setSearchPk(null); }}
                            placeholder={t.searchUserPlaceholder || 'name, nip05 or npub1...'}
                            style={{
                                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px',
                                border: searchNotFound ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.85rem'
                            }}
                        />
                        {(searchPk || isTextSearch) ? (
                            <button type="button" onClick={clearSearch}
                                style={{ padding: '0 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                <XIcon size={14} />
                            </button>
                        ) : (
                            <button type="submit" disabled={!searchInput.trim()}
                                style={{ padding: '0 0.75rem', borderRadius: '8px', cursor: searchInput.trim() ? 'pointer' : 'not-allowed', opacity: searchInput.trim() ? 1 : 0.5, fontSize: '0.85rem' }}>
                                {t.searchUser || 'Find'}
                            </button>
                        )}
                    </form>
                    {isSearching && isTextSearch && (
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                            {t.loading || 'Searching...'}
                        </p>
                    )}
                    {searchNotFound && (
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--danger)' }}>
                            {t.noSearchResult || 'User not found'}
                        </p>
                    )}
                    {searchPk && (
                        <div style={{ marginTop: '0.6rem' }}>
                            <NetworkUserRow key={searchPk} pk={searchPk} t={t}
                                isFollowed={followedPks.has(searchPk)} hasKeys={!!myKeys}
                                onFollow={() => onFollow(searchPk)} onUnfollow={() => onUnfollow(searchPk)}
                                onOpenChat={(pubkey: string, npub: string) => { onClose(); onOpenChat(pubkey, npub); }}
                                onOpenZap={(pubkey: string, npub: string, noteId?: string, lud16?: string) => { onClose(); onOpenZap(pubkey, npub, noteId, lud16); }}
                                onProfileLoaded={(p) => setProfiles(prev => ({ ...prev, [searchPk]: p }))} />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '0 1.2rem 0.5rem 1.2rem' }}>
                    <button
                        onClick={() => setActiveTab('followers')}
                        style={{
                            flex: 1, padding: '0.6rem', fontSize: '1rem', fontWeight: 600,
                            background: 'transparent', border: 'none',
                            color: activeTab === 'followers' ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === 'followers' ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t.followers || 'Followers'} ({loadingFollowers ? '...' : tabCount('followers')})
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        style={{
                            flex: 1, padding: '0.6rem', fontSize: '1rem', fontWeight: 600,
                            background: 'transparent', border: 'none',
                            color: activeTab === 'following' ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === 'following' ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t.following || 'Following'} ({tabCount('following')})
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.2rem 1.2rem 1.2rem', minHeight: '200px' }}>
                    {activeTab === 'followers' && loadingFollowers ? (
                        <p style={{ textAlign: 'center', opacity: .5, padding: '2rem 0' }}>{t.loading || 'Loading...'}</p>
                    ) : filteredDisplayPks.length === 0 ? (
                        <p style={{ textAlign: 'center', opacity: .5, padding: '2rem 0' }}>
                            {isTextSearch
                                ? (t.noSearchResult || 'No users match your search')
                                : activeTab === 'following' ? t.noFollowing : 'Nenhum seguidor ainda.'}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                            {filteredDisplayPks.map(pk => (
                                <NetworkUserRow key={pk} pk={pk} t={t}
                                    isFollowed={followedPks.has(pk)} hasKeys={!!myKeys}
                                    onFollow={() => onFollow(pk)} onUnfollow={() => onUnfollow(pk)}
                                    onOpenChat={(pubkey: string, npub: string) => { onClose(); onOpenChat(pubkey, npub); }}
                                    onOpenZap={(pubkey: string, npub: string, noteId?: string, lud16?: string) => { onClose(); onOpenZap(pubkey, npub, noteId, lud16); }}
                                    onProfileLoaded={(p) => setProfiles(prev => ({ ...prev, [pk]: p }))} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface NetworkUserRowProps {
    pk: string;
    t: Translations;
    isFollowed: boolean;
    hasKeys: boolean;
    onFollow: () => void;
    onUnfollow: () => void;
    onOpenChat: (pubkey: string, npub: string) => void;
    onOpenZap: (pubkey: string, npub: string, noteId?: string, lud16?: string) => void;
    onProfileLoaded?: (profile: Record<string, string>) => void;
}

function NetworkUserRow({ pk, t, isFollowed, hasKeys, onFollow, onUnfollow, onOpenChat, onOpenZap, onProfileLoaded }: NetworkUserRowProps) {
    const [profile, setProfile] = useState<Record<string, string>>({});
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        fetchProfile(pk, p => {
            setProfile(p);
            onProfileLoaded?.(p);
        });
    }, [pk]);

    const npub = nip19.npubEncode(pk);
    const displayName = profile?.display_name || profile?.name || npub.slice(0, 12) + '...';

    return (
        <>
            <div
                onClick={() => setShowPopup(true)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.04)', padding: '.65rem', borderRadius: '8px',
                    cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', overflow: 'hidden' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,var(--primary),var(--accent))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.75rem', fontWeight: 'bold', color: 'white'
                    }}>
                        {npub.slice(-2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {displayName}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                            {npub.slice(0, 10)}...{npub.slice(-6)}
                        </span>
                    </div>
                </div>
            </div>

            {showPopup && (
                <AuthorProfile
                    pubkey={pk} npub={npub} t={t}
                    onClose={() => setShowPopup(false)}
                    isFollowed={isFollowed} hasKeys={hasKeys}
                    onFollow={onFollow} onUnfollow={onUnfollow}
                    onChat={() => { setShowPopup(false); onOpenChat(pk, npub); }}
                    onZap={() => { setShowPopup(false); onOpenZap(pk, npub, undefined, profile?.lud16); }}
                />
            )}
        </>
    );
}
