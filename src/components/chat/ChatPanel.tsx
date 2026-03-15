import { useState, useEffect, useRef } from 'react';
import { nip19 } from 'nostr-tools';
import type { UnsignedEvent } from 'nostr-tools';

type Rumor = UnsignedEvent & { id: string };
import { publishEncryptedDM, subscribeToConversation, fetchProfile } from '../../services/nostr/nostr';
import type { Translations } from '../../i18n/translations';
import { ZapIcon } from '../ui/icons';

interface ChatMessage {
    id: string;
    fromMe: boolean;
    text: string;
    created_at: number;
}

interface ChatModalProps {
    t: Translations;
    myKeys: { sk: Uint8Array; pk: string; nsec: string; npub: string };
    targetPubkey: string;
    targetLabel: string;
    onClose: () => void;
    onOpenZap?: (pubkey: string, npub: string, noteId?: string, lud16?: string) => void;
    onOpenProfile?: (pubkey: string, npub: string) => void;
}

export function ChatPanel({ t, myKeys, targetPubkey, targetLabel, onClose, onOpenZap, onOpenProfile }: ChatModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const targetNpub = nip19.npubEncode(targetPubkey);
    const [targetProfile, setTargetProfile] = useState<Record<string, string>>({});

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessages([]);
        let cancelled = false;
        const seen = new Set<string>();

        const handleEvent = (rumor: Rumor) => {
            if (cancelled) return; // ignore events from a stale subscription after cleanup
            if (seen.has(rumor.id)) return;
            seen.add(rumor.id);

            const fromMe = rumor.pubkey === myKeys.pk;
            setMessages(prev => {
                // If a real message arrives, remove any optimistic 'temp-' messages with the exact same text
                const next = prev.filter(m => !(m.id.startsWith('temp-') && m.text === rumor.content && m.fromMe === fromMe));
                next.push({ id: rumor.id, fromMe, text: rumor.content, created_at: rumor.created_at });
                return next.sort((a, b) => a.created_at - b.created_at);
            });
        };

        const unsub = subscribeToConversation(myKeys.sk, targetPubkey, handleEvent);
        
        fetchProfile(targetPubkey, (p) => {
            setTargetProfile(p);
        });

        return () => { cancelled = true; unsub(); };
    }, [myKeys.pk, myKeys.sk, targetPubkey]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const msgText = input.trim();
        if (!msgText || sending) return;

        setSending(true);
        setInput('');

        // Optimistically add message BEFORE waiting for relay (Fixes race condition with fast relays)
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: ChatMessage = {
            id: tempId,
            fromMe: true,
            text: msgText,
            created_at: Math.floor(Date.now() / 1000)
        };

        setMessages(prev => {
            const isDuplicate = prev.some(m => m.text === msgText && m.fromMe && Date.now() / 1000 - m.created_at < 5);
            if (isDuplicate) return prev;
            return [...prev, optimisticMsg].sort((a, b) => a.created_at - b.created_at);
        });

        const ok = await publishEncryptedDM(myKeys.sk, targetPubkey, msgText);
        if (!ok) {
            // Revert on failure
            setInput(msgText);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
        setSending(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const fmt = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const PREVIEW_LEN = 140;

    return (
        <div className="chat-panel-sidebar glass-panel">
            <div className="chat-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                        style={{ color: 'var(--purple)', fontSize: '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: onOpenProfile ? 'pointer' : 'default' }}
                        onClick={() => onOpenProfile?.(targetPubkey, targetNpub)}
                    >
                        🔐 {targetLabel || targetNpub.slice(0, 12) + '...'}
                    </h3>
                    <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '.1rem' }}>
                        {targetNpub.slice(0, 20)}...
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onOpenZap && (
                        <button className="btn-icon" onClick={() => onOpenZap(targetPubkey, targetNpub, undefined, targetProfile?.lud16)} style={{ padding: '0.3rem 0.6rem', flexShrink: 0 }} title={t.zap || 'Zap'}>
                            <ZapIcon />
                        </button>
                    )}
                    <button className="btn-icon" onClick={onClose} style={{ padding: '0.3rem 0.6rem', flexShrink: 0 }}>✕</button>
                </div>
            </div>

            {/* Encryption notice */}
            <div style={{ fontSize: '.64rem', padding: '0.35rem 1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', background: 'rgba(139,92,246,.05)' }}>
                {t.e2eNotice}
            </div>

            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                {messages.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', fontSize: '.8rem' }}>{t.noMsgs}</p>
                )}
                {messages.map(m => {
                    const isLong = m.text.length > PREVIEW_LEN;
                    const expanded = expandedId === m.id;
                    const displayText = isLong && !expanded ? m.text.slice(0, PREVIEW_LEN) + '…' : m.text;
                    return (
                        <div key={m.id} className={`chat-bubble ${m.fromMe ? 'mine' : 'theirs'}`}
                            onClick={() => isLong && setExpandedId(expanded ? null : m.id)}
                            style={{ cursor: isLong ? 'pointer' : 'default' }}
                        >
                            <div className="bubble-text">{displayText}</div>
                            {isLong && (
                                <div style={{ fontSize: '.68rem', opacity: .55, marginTop: '.2rem', textAlign: m.fromMe ? 'right' : 'left' }}>
                                    {expanded ? '▲ ' + t.collapse : '▼ ' + t.expand}
                                </div>
                            )}
                            <div className="bubble-time">{fmt(m.created_at)}</div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-row" style={{ padding: '0.75rem' }}>
                <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder={t.typeMsg}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    rows={2}
                    style={{ fontSize: '.85rem' }}
                />
                <button
                    className="chat-send-btn btn-small"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                >
                    {sending ? '...' : '↑'}
                </button>
            </div>
        </div>
    );
}
