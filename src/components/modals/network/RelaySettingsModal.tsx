import { useState, useEffect } from 'react';
import type { Translations } from '../../../i18n/translations';
import { RELAY_CONFIGS, DEFAULT_RELAYS, updateRelays, subscribeRelayStatus, type RelayState, publishNip65Relays } from '../../../services/nostr/nostr';

interface RelaySettingsModalProps {
    t: Translations;
    keys?: { sk: Uint8Array; pk: string } | null;
    onClose: () => void;
}

export function RelaySettingsModal({ t, keys, onClose }: RelaySettingsModalProps) {
    const [relays, setRelays] = useState<RelayState[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [error, setError] = useState('');
    const [confirmRestore, setConfirmRestore] = useState(false);
    const [confirmRemoveUrl, setConfirmRemoveUrl] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeRelayStatus(setRelays);
        return unsub;
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const url = newUrl.trim().toLowerCase();
        if (!url) return;

        if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
            setError(t.invalidRelayUrl || 'Must start with wss://');
            return;
        }

        if (RELAY_CONFIGS.some(r => r.url === url)) {
            setNewUrl('');
            return;
        }

        const name = url.replace('wss://', '').replace('ws://', '');
        const newConfigs = [...RELAY_CONFIGS, { url, name }];
        updateRelays(newConfigs);
        if (keys?.sk) publishNip65Relays(keys.sk, newConfigs);
        setNewUrl('');
    };

    const handleRemove = (urlToRemove: string) => {
        const newConfigs = RELAY_CONFIGS.filter(r => r.url !== urlToRemove);
        updateRelays(newConfigs);
        if (keys?.sk) publishNip65Relays(keys.sk, newConfigs);
        setConfirmRemoveUrl(null);
    };

    const getStatusColor = (status: string) => {
        if (status === 'connected') return 'var(--success)';
        if (status === 'connecting') return 'var(--warning)';
        return 'var(--danger)';
    };

    const getStatusText = (status: string) => {
        const statusTranslations = t.relayStatus || { connecting: 'Connecting...', connected: 'Connected', offline: 'Offline', error: 'Error' };
        return statusTranslations[status] || status;
    };

    return (
        // Sem onClick no overlay — modal de configuração não pode fechar acidentalmente
        <div className="modal-overlay" style={{ zIndex: 60 }}>
            <div className="modal-box about-nostr-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(450px, 100%)' }}>
                <div className="about-nostr-header">
                    <div>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '.2rem' }}>{t.relaySettings || '🌐 Relay Settings'}</h2>
                        <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: 0 }}>
                            {t.relaySettingsDesc || 'Merka connects directly to the Nostr network. Add or remove relays to stay connected and bypass censorship.'}
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem', flexShrink: 0 }}>✕</button>
                </div>

                <div className="about-nostr-body" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                value={newUrl}
                                onChange={e => { setNewUrl(e.target.value); setError(''); }}
                                placeholder={t.addRelay || 'wss://...'}
                                style={{
                                    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                    border: error ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)', color: 'white'
                                }}
                            />
                            {error && <span style={{ position: 'absolute', bottom: '-18px', left: '4px', fontSize: '0.7rem', color: 'var(--danger)' }}>{error}</span>}
                        </div>
                        <button type="submit" disabled={!newUrl.trim()} style={{ padding: '0 1rem', borderRadius: '8px', cursor: newUrl.trim() ? 'pointer' : 'not-allowed', opacity: newUrl.trim() ? 1 : 0.5 }}>
                            {t.add || 'Add'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {relays.map(r => (
                            <div key={r.url}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(255,255,255,0.05)', padding: '0.7rem', borderRadius: confirmRemoveUrl === r.url ? '8px 8px 0 0' : '8px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.url}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(r.status) }} />
                                            <span style={{ fontSize: '0.75rem', color: getStatusColor(r.status) }}>
                                                {getStatusText(r.status)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setConfirmRemoveUrl(confirmRemoveUrl === r.url ? null : r.url)}
                                            className="btn-icon"
                                            title={t.clearHistoryIndiv || 'Remove'}
                                            style={{ padding: '0.3rem', color: 'var(--danger)', opacity: relays.length <= 1 ? 0.3 : 1, cursor: relays.length <= 1 ? 'not-allowed' : 'pointer' }}
                                            disabled={relays.length <= 1}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                {confirmRemoveUrl === r.url && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: '0.5rem', padding: '0.5rem 0.7rem',
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        borderTop: 'none', borderRadius: '0 0 8px 8px'
                                    }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                                            {t.confirmDelete || 'Are you sure?'}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                onClick={() => handleRemove(r.url)}
                                                style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, minHeight: '36px' }}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => setConfirmRemoveUrl(null)}
                                                style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem', minHeight: '36px' }}
                                            >
                                                {t.cancel || 'Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {relays.length <= 2 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--warning)', textAlign: 'center', margin: 0 }}>
                            {t.minRelaysWarning || 'You should keep at least two relays to ensure a stable connection.'}
                        </p>
                    )}

                    {confirmRestore && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--danger)', textAlign: 'center', margin: '0.5rem 0 0' }}>
                            {t.confirmRestoreDefaults || "Are you sure you want to restore the default relays? This will override your current list."}
                        </p>
                    )}
                    <button
                        onClick={() => {
                            if (!confirmRestore) {
                                setConfirmRestore(true);
                            } else {
                                updateRelays([...DEFAULT_RELAYS]);
                                if (keys?.sk) publishNip65Relays(keys.sk, [...DEFAULT_RELAYS]);
                                setConfirmRestore(false);
                            }
                        }}
                        style={{
                            width: '100%', marginTop: '0.5rem', padding: '0.6rem',
                            background: confirmRestore ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                            color: confirmRestore ? 'var(--danger)' : 'var(--text-main)',
                            border: confirmRestore ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
                        }}
                    >
                        {confirmRestore ? (t.confirmDelete || 'Are you sure?') : (t.restoreDefaults || 'Restore Defaults')}
                    </button>
                    {confirmRestore && (
                        <button
                            onClick={() => setConfirmRestore(false)}
                            style={{
                                width: '100%', marginTop: '0.5rem', padding: '0.6rem',
                                background: 'transparent', color: 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            {t.cancel || 'Cancel'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
