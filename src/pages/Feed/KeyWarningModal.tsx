import { useState } from 'react';
import type { Translations } from '../../i18n/translations';
import { CopyIcon } from '../../components/ui/icons';

export function KeyWarningModal({ t, nsec, onClose }: { t: Translations; nsec: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(nsec); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ borderColor: 'rgba(239,68,68,.35)', maxWidth: 440 }}>
        <h3 style={{ color: 'var(--danger)' }}>🔐 {t.saveYourKey}</h3>
        <p style={{ fontSize: '.9rem', lineHeight: 1.6 }}>{t.saveKeyDesc}</p>
        <div className="nsec-section" style={{ margin: '.75rem 0' }}>
          <div className="profile-field-label" style={{ color: 'var(--danger)' }}>{t.secKey}:</div>
          <div className="nsec-row">
            <code className="nsec-value" style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{nsec}</code>
            <button className="btn-icon" onClick={copy} style={{ flexShrink: 0 }}>
              {copied ? <span style={{ fontSize: '.65rem', color: 'var(--success)' }}>{t.copied}</span> : <CopyIcon />}
            </button>
          </div>
        </div>
        <div className="about-warning">{t.keyWarningNote}</div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '.75rem', background: 'var(--danger)' }}>
          {t.savedKey}
        </button>
      </div>
    </div>
  );
}
