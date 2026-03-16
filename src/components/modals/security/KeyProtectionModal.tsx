import { useState } from 'react';
import type { Translations } from '../../../i18n/translations';

interface KeyProtectionModalProps {
    t: Translations;
    onProtect: (password: string) => void;
    onSkip: () => void;
}

export function KeyProtectionModal({ t, onProtect, onSkip }: KeyProtectionModalProps) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    const handleProtect = () => {
        if (password.length < 6) { setError(t.protectKeyTooShort ?? 'Minimum 6 characters.'); return; }
        if (password !== confirm) { setError(t.protectKeyMismatch ?? 'Passwords do not match.'); return; }
        onProtect(password);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(420px, 100%)', borderColor: 'rgba(139,92,246,.35)' }}>
                <h3 style={{ color: 'var(--purple)', marginBottom: '.5rem' }}>
                    🔐 {t.protectKeyTitle ?? 'Protect Your Key'}
                </h3>
                <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {t.protectKeyDesc ?? 'Add a password to encrypt your private key on this device. If you forget it, use your nsec to log in again.'}
                </p>

                <div className="form-group" style={{ marginBottom: '.75rem' }}>
                    <label style={{ fontSize: '.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '.3rem' }}>
                        {t.protectKeyPassword ?? 'Password'}
                    </label>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleProtect()}
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

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '.3rem' }}>
                        {t.protectKeyConfirm ?? 'Confirm password'}
                    </label>
                    <input
                        type={showPw ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleProtect()}
                        placeholder="••••••••"
                        style={{ width: '100%' }}
                    />
                </div>

                {error && (
                    <div style={{ fontSize: '.82rem', color: 'var(--danger)', marginBottom: '.75rem', fontWeight: 500 }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '.75rem' }}>
                    <button
                        onClick={onSkip}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '.85rem' }}
                    >
                        {t.skipProtection ?? 'Save without password'}
                    </button>
                    <button
                        onClick={handleProtect}
                        disabled={!password}
                        style={{ flex: 1, background: 'var(--purple)', fontSize: '.85rem' }}
                    >
                        {t.protectKeyBtn ?? 'Protect key'} 🔐
                    </button>
                </div>
            </div>
        </div>
    );
}
