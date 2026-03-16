import { useState } from 'react';
import type { Translations } from '../../../i18n/translations';

interface UnlockKeyModalProps {
    t: Translations;
    onUnlock: (password: string) => void;
    onUseOtherKey: () => void;
    error?: string;
}

export function UnlockKeyModal({ t, onUnlock, onUseOtherKey, error }: UnlockKeyModalProps) {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handleUnlock = () => {
        if (!password) return;
        onUnlock(password);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(400px, 100%)', borderColor: 'rgba(139,92,246,.35)' }}>
                <h3 style={{ color: 'var(--purple)', marginBottom: '.5rem' }}>
                    🔐 {t.unlockTitle ?? 'Unlock Account'}
                </h3>
                <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {t.unlockDesc ?? 'Enter your password to access the saved account.'}
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                            placeholder="••••••••"
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <button
                            className="btn-icon"
                            onClick={() => setShowPw(v => !v)}
                            type="button"
                            style={{ padding: '.4rem .6rem', flexShrink: 0 }}
                            aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                            {showPw ? '🙈' : '👁'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ fontSize: '.82rem', color: 'var(--danger)', marginBottom: '.75rem', fontWeight: 500 }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '.75rem' }}>
                    <button
                        onClick={onUseOtherKey}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '.85rem' }}
                    >
                        {t.unlockUseOtherKey ?? 'Use another key'}
                    </button>
                    <button
                        onClick={handleUnlock}
                        disabled={!password}
                        style={{ flex: 1, background: 'var(--purple)', fontSize: '.85rem' }}
                    >
                        {t.unlockBtn ?? 'Unlock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
