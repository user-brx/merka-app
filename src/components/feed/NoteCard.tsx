import { useState, useEffect, useRef } from 'react';
import { nip19 } from 'nostr-tools';
import { subscribeToReactions, fetchProfile } from '../../services/nostr/nostr';
import type { Translations } from '../../i18n/translations';
import { ChatHistoryIcon } from '../ui/icons';

export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
}

// Only allow http/https links — blocks javascript: and data: URLs
const safeUrl = (url?: string): string | null =>
    url?.match(/^https?:\/\//) ? url : null;

// ── Icons ───────────────────────────────────────────────────────────────────
const HeartIcon = ({ filled }: { filled?: boolean }) => <span>{filled ? '❤️' : '🤍'}</span>;
const UserPlusIcon = () => <span>➕👤</span>;
const UserMinusIcon = () => <span>➖👤</span>;
const ExternalLinkIcon = () => <span>🔗</span>;
const ZapIcon = () => <span>⚡</span>;
const XIcon = () => <span>❌</span>;
const CopyIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;


// ── Author Profile mini-popup ────────────────────────────────────────────────
export interface AuthorProfileProps {
    pubkey: string;
    npub: string;
    t: Translations;
    onClose: () => void;
    onFollow: () => void;
    onUnfollow: () => void;
    onChat: () => void;
    onZap?: () => void;
    isFollowed: boolean;
    hasKeys: boolean;
}

export function AuthorProfile({ pubkey: _pubkey, npub, t, onClose, onFollow, onUnfollow, onChat, onZap, isFollowed, hasKeys }: AuthorProfileProps) {
    const [profile, setProfile] = useState<Record<string, string>>({});
    const [unfollowedLocal, setUnfollowedLocal] = useState(false);
    const [confirmUnfollow, setConfirmUnfollow] = useState(false);
    const [npubCopied, setNpubCopied] = useState(false);

    const copyNpub = () => {
        navigator.clipboard.writeText(npub);
        setNpubCopied(true);
        setTimeout(() => setNpubCopied(false), 2000);
    };

    useEffect(() => {
        fetchProfile(_pubkey, p => setProfile(p as Record<string, string>));
    }, [_pubkey]);

    const name = profile.display_name || profile.name || npub.slice(0, 12) + '...';
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <>
            <div className="profile-modal-overlay" onClick={onClose} />
            <div className="author-profile-popup" ref={popupRef} onClick={e => e.stopPropagation()}>
                <div className="author-profile-header">
                    <div className="profile-avatar-placeholder" style={{ width: 54, height: 54, fontSize: '1rem' }}>
                        {npub.slice(-2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-light)' }}>{name}</div>
                        {profile.nip05 && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>NIP-05: {profile.nip05}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.2rem' }}>
                            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{npub.slice(0, 12)}...{npub.slice(-6)}</span>
                            <button className="btn-icon" onClick={copyNpub} aria-label={t.copied} style={{ padding: '.2rem .3rem', fontSize: '.65rem' }}>
                                {npubCopied ? <span style={{ color: 'var(--success)', fontSize: '.65rem' }}>{t.copied}</span> : <CopyIcon />}
                            </button>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.5rem', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}><XIcon /></button>
                </div>
                {profile.about && (
                    <div className="note-content" style={{ fontSize: '.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '1rem 0', maxHeight: '150px' }}>
                        {profile.about}
                    </div>
                )}
                {(profile.website || profile.lud16) && (
                    <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', margin: '.5rem 0' }}>
                        {safeUrl(profile.website) && <a href={safeUrl(profile.website)!} target="_blank" rel="noopener noreferrer" className="about-client-pill" style={{ fontSize: '.8rem' }}>🌐 {profile.website!.replace(/https?:\/\//, '')}</a>}
                        {profile.lud16 && <span className="about-client-pill" style={{ fontSize: '.8rem' }}>⚡ {profile.lud16}</span>}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem' }}>
                    {(!isFollowed || unfollowedLocal) && (
                        <button
                            className={`note-action-btn follow`}
                            onClick={onFollow}
                            disabled={!hasKeys}
                            style={{ flex: 1, padding: '.5rem', fontSize: '.75rem' }}
                        >
                            <UserPlusIcon /> {t.follow}
                        </button>
                    )}
                    {isFollowed && !unfollowedLocal && (
                        <button
                            className="note-action-btn follow"
                            onClick={() => setConfirmUnfollow(true)}
                            style={{ flex: 1, padding: '.5rem', fontSize: '.75rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                            <UserMinusIcon /> {t.unfollow}
                        </button>
                    )}
                    {hasKeys && (
                        <button className="note-action-btn dm" onClick={onChat} style={{ flex: 1, padding: '.5rem', fontSize: '.75rem' }}>
                            <ChatHistoryIcon /> {t.secretChat}
                        </button>
                    )}
                    {onZap && (
                        <button className="note-action-btn zap" onClick={onZap} style={{ flex: 1, padding: '.5rem', fontSize: '.75rem' }}>
                            <ZapIcon /> {t.zap}
                        </button>
                    )}
                </div>

                {/* Unfollow confirmation modal */}
                {confirmUnfollow && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, backdropFilter: 'blur(3px)'
                    }} onClick={() => setConfirmUnfollow(false)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'rgba(15,22,36,0.98)', border: '1px solid var(--border-color)',
                            borderRadius: '16px', padding: '1.5rem', maxWidth: 320, width: '90%',
                            display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {t.unfollow}
                            </div>
                            <div style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {t.confirm} <strong style={{ color: 'var(--text-main)' }}>{name}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '.6rem' }}>
                                <button
                                    onClick={() => setConfirmUnfollow(false)}
                                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                                >{t.cancel}</button>
                                <button
                                    onClick={() => { setUnfollowedLocal(true); setConfirmUnfollow(false); onUnfollow(); }}
                                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }}
                                >{t.confirm}</button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Open in external app */}
                <a href={`https://primal.net/p/${npub}`} target="_blank" rel="noopener noreferrer"
                    className="note-action-btn"
                    style={{ marginTop: '.6rem', width: '100%', justifyContent: 'center', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.04)', padding: '.6rem' }}>
                    <ExternalLinkIcon /> {t.openInApp}
                </a>
            </div >
        </>
    );
}

// ── NoteCard ─────────────────────────────────────────────────────────────────
interface NoteCardProps {
    note: NostrEvent;
    t: Translations;
    myKeys: { sk: Uint8Array; pk: string } | null;
    likedIds: Set<string>;
    followedPks: Set<string>;
    onLike: (note: NostrEvent) => void;
    onFollow: (pubkey: string) => void;
    onUnfollow: (pubkey: string) => void;
    onOpenChat: (pubkey: string, npub: string) => void;
    onOpenZap: (targetPubkey: string, targetNpub: string, noteId?: string, lud16?: string) => void;
    formatTime: (ts: number) => string;
    renderContent: (content: string) => React.ReactNode;
    extractNoteType?: (content: string) => 'buy' | 'sell' | null;
}

export function NoteCard({
    note, t, myKeys, likedIds, followedPks,
    onLike, onFollow, onUnfollow, onOpenChat, onOpenZap,
    formatTime, renderContent, extractNoteType
}: NoteCardProps) {
    const [likeCount, setLikeCount] = useState(0);
    const [localToast, setLocalToast] = useState('');
    const [showAuthorProfile, setShowAuthorProfile] = useState(false);
    const [profile, setProfile] = useState<Record<string, string>>({});

    const isMe = myKeys?.pk === note.pubkey;
    const isLiked = likedIds.has(note.id);
    const isFollowed = followedPks.has(note.pubkey);
    const npub = nip19.npubEncode(note.pubkey);

    useEffect(() => {
        fetchProfile(note.pubkey, p => setProfile(p as Record<string, string>));
    }, [note.pubkey]);

    useEffect(() => {
        const unsub = subscribeToReactions(note.id, (ev) => {
            if (ev.content === '+' || ev.content === '❤️') setLikeCount(p => p + 1);
        });
        return () => unsub();
    }, [note.id]);

    const toast = (msg: string) => { setLocalToast(msg); setTimeout(() => setLocalToast(''), 2500); };
    const handleLike = () => { onLike(note); toast(t.liked); };
    const handleFollow = () => { onFollow(note.pubkey); toast(t.followedToast); };

    return (
        <div className="note-card" style={{ position: 'relative' }}>
            {localToast && (
                <div style={{
                    position: 'absolute', bottom: '0.5rem', right: '0.75rem',
                    background: 'rgba(16,185,129,0.9)', color: '#fff',
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.6rem',
                    borderRadius: '8px', zIndex: 5, pointerEvents: 'none'
                }}>{localToast}</div>
            )}

            {/* Author profile popup */}
            {showAuthorProfile && !isMe && (
                <AuthorProfile
                    pubkey={note.pubkey}
                    npub={npub}
                    t={t}
                    onClose={() => setShowAuthorProfile(false)}
                    onFollow={() => { handleFollow(); setShowAuthorProfile(false); }}
                    onUnfollow={() => { onUnfollow(note.pubkey); }}
                    onChat={() => { onOpenChat(note.pubkey, npub); setShowAuthorProfile(false); }}
                    onZap={() => { onOpenZap(note.pubkey, npub, undefined, profile?.lud16); setShowAuthorProfile(false); }}
                    isFollowed={isFollowed}
                    hasKeys={!!myKeys}
                />
            )}

            <div
                className="note-header"
                onClick={() => !isMe && setShowAuthorProfile(v => !v)}
                style={{ cursor: isMe ? 'default' : 'pointer' }}
            >
                <div className="author-info">
                    {extractNoteType && (() => {
                        const noteType = extractNoteType(note.content);
                        if (!noteType) return null;
                        return (
                            <span style={{
                                background: noteType === 'buy' ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.18)',
                                color: noteType === 'buy' ? 'var(--primary)' : 'var(--accent)',
                                padding: '.1rem .45rem', borderRadius: '4px',
                                fontSize: '.68rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.5px'
                            }}>
                                {noteType === 'buy' ? t.buy : t.sell}
                            </span>
                        );
                    })()}
                    <span className="author-name">{profile?.display_name || profile?.name || 'Anon'}</span>
                    <span className="author-npub">{npub.slice(0, 10)}...</span>
                </div>
                <div className="note-meta">
                    {formatTime(note.created_at)}
                </div>
            </div>

            <div className="note-content">{renderContent(note.content)}</div>

            {/* Actions */}
            <div className="note-actions">
                <button
                    className={`note-action-btn like${isLiked ? ' liked' : ''}`}
                    onClick={handleLike}
                    disabled={!myKeys || isLiked}
                >
                    <HeartIcon filled={isLiked} />
                    {likeCount > 0 ? likeCount : t.like}
                </button>

                {!isMe && myKeys && (
                    <button className="note-action-btn dm" onClick={() => onOpenChat(note.pubkey, npub)}>
                        <ChatHistoryIcon />{t.secretChat}
                    </button>
                )}

                {!isMe && (
                    <button
                        className={`note-action-btn follow${isFollowed ? ' following' : ''}`}
                        onClick={handleFollow}
                        disabled={!myKeys || isFollowed}
                    >
                        <UserPlusIcon />
                        {isFollowed ? t.following : t.follow}
                    </button>
                )}
            </div>
        </div>
    );
}
