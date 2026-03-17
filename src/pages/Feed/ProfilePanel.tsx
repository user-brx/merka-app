import { useState, useEffect } from 'react';
import type { Translations } from '../../i18n/translations';
import { fetchProfile, publishProfile } from '../../services/nostr/nostr';
import { CopyIcon, EditIcon, ExternalLinkIcon, HelpCircleIcon, XIcon } from '../../components/ui/icons';
import { useDragToClose } from '../../hooks/useDragToClose';

interface ProfileData { name?: string; display_name?: string; about?: string; picture?: string; website?: string; lud16?: string; nip05?: string; bitcoin?: string; }

export interface ProfilePanelProps {
  t: Translations;
  keys: { sk: Uint8Array; pk: string; nsec: string; npub: string };
  onClose: () => void;
  onUpdate: (p: ProfileData) => void;
  onToast: (msg: string) => void;
}

export function ProfilePanel({ t, keys, onClose, onUpdate, onToast }: ProfilePanelProps) {
  const dragProps = useDragToClose(onClose);
  const [profile, setProfile] = useState<ProfileData>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nsecCopied, setNsecCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);

  useEffect(() => {
    fetchProfile(keys.pk, (p: unknown) => setProfile(p as ProfileData));
  }, [keys.pk]);

  const field = (label: string, key: keyof ProfileData, placeholder = '', help?: string) => (
    <div className="form-group">
      <div className="profile-field-label">
        {label}
        {help && (
          <span className="field-help-icon" title={help}><HelpCircleIcon /></span>
        )}
      </div>
      {editing ? (
        <input value={profile[key] || ''} placeholder={placeholder}
          onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} />
      ) : (
        <div className="profile-field-value">{profile[key] || <span style={{ opacity: 0.4 }}>—</span>}</div>
      )}
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    await publishProfile(keys.sk, profile);
    onUpdate(profile);
    setSaving(false);
    setEditing(false);
    onToast(t.profileUpdated);
  };

  const copyNsec = () => {
    navigator.clipboard.writeText(keys.nsec);
    setNsecCopied(true);
    setTimeout(() => setNsecCopied(false), 2000);
  };
  const copyNpub = () => {
    navigator.clipboard.writeText(keys.npub);
    setNpubCopied(true);
    setTimeout(() => setNpubCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={editing ? undefined : onClose}>
      <div className="modal-box profile-modal-box" onClick={e => e.stopPropagation()} {...dragProps}>
        <div className="profile-modal-header">
          <div className="profile-avatar-placeholder">
            {keys.npub.slice(-2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.3rem' }}>
              <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, flex: '1 1 auto', minWidth: 0 }}>
                {profile.display_name || profile.name || 'Anonymous'}
              </h3>
              <a href={`https://primal.net/p/${keys.npub}`} target="_blank" rel="noopener noreferrer"
                className="primal-link-btn" title={t.openInApp}>
                <ExternalLinkIcon /> Primal
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <div className="profile-pubkey-chip" style={{ flex: 'none' }}>
                {keys.npub.slice(0, 12)}...{keys.npub.slice(-8)}
              </div>
              <button className="btn-icon" onClick={copyNpub} style={{ padding: '.25rem .4rem', fontSize: '.7rem' }}>
                {npubCopied ? <span style={{ fontSize: '.65rem', color: 'var(--success)' }}>{t.copied}</span> : <CopyIcon />}
              </button>
            </div>
          </div>
          {!editing && (
            <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem' }}><XIcon /></button>
          )}
        </div>

        <div className="profile-modal-body">
          {/* Private key section — high visibility warning */}
          <div className="nsec-section">
            <div className="profile-field-label" style={{ color: 'var(--danger)', marginBottom: '.35rem' }}>
              🔴 {t.secKey}
            </div>
            <div className="nsec-row">
              <code className="nsec-value">{keys.nsec.slice(0, 18)}•••••••••••••</code>
              <button className="btn-icon" onClick={copyNsec} style={{ flexShrink: 0 }}>
                {nsecCopied ? <span style={{ fontSize: '.65rem', color: 'var(--success)' }}>{t.copied}</span> : <CopyIcon />}
              </button>
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--danger)', marginTop: '.5rem', opacity: .8, fontWeight: 500 }}>
              ⚠️ {t.keepPrivate}
            </div>
          </div>

          <div className="profile-fields-grid">
            {field(t.username, 'name', 'satoshi')}
            {field(t.displayName, 'display_name', 'Satoshi Nakamoto')}
            <div className="fields-divider" />
            {field(t.lightningAddress, 'lud16', 'you@walletofsatoshi.com', t.helpLud16)}
            {field(t.bitcoinAddress, 'bitcoin', 'bc1q...', t.helpBitcoin)}
            <div className="fields-divider" />
            {field(t.website, 'website', 'https://...', t.helpWebsite)}
            {field(t.nip05, 'nip05', 'you@domain.com', t.helpNip05)}
            <div className="fields-divider" />
            {field(t.bio, 'about', t.bioPlaceholder || 'A brief description about yourself...')}
          </div>
        </div>

        <div className="modal-actions profile-modal-actions">
          {editing ? (
            <>
              <button className="cancel-btn btn-secondary" onClick={() => setEditing(false)} style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? '...' : t.saveProfile}</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '.75rem', width: '100%' }}>
              <button onClick={() => setEditing(true)} style={{ flex: 1, background: 'var(--primary)' }}>
                <EditIcon /> {t.editProfile}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
