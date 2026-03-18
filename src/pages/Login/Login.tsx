import { useState, type FormEvent } from 'react';
import type { Translations } from '../../i18n/translations';

export interface ProfileSetupData {
  name: string;
  display_name: string;
  about: string;
  website: string;
  lud16: string;
}

interface LoginProps {
  t: Translations;
  loginError: string;
  onLogin: (keyInput: string) => void;
  onCreateAccount: (profile: ProfileSetupData) => void;
}

export function LoginScreen({ t, loginError, onLogin, onCreateAccount }: LoginProps) {
  const [loginInput, setLoginInput] = useState('');
  
  const [showProfileFields, setShowProfileFields] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileLud16, setProfileLud16] = useState('');

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    onLogin(loginInput.trim());
  };

  const handleCreateSubmit = () => {
    onCreateAccount({
      name: profileName,
      display_name: profileDisplayName,
      about: profileBio,
      website: profileWebsite,
      lud16: profileLud16
    });
  };

  return (
    <section className="glass-panel auth-section">
      <h2>{t.welcome}</h2>
      <p>{t.welcomeDesc}</p>

      <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.25rem', borderRadius: '12px', fontSize: '.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        {t.loginTip}
      </div>

      <div className="profile-accordion">
        <div
          className="profile-accordion-header"
          onClick={() => setShowProfileFields(v => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setShowProfileFields(v => !v)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: '1rem' }}>⚙️</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.12rem' }}>
              <span style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--text-main)' }}>
                {showProfileFields ? t.hideMoreInfo : t.addMoreInfo}
              </span>
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                {t.username}, {t.displayName}, {t.bio}…
              </span>
            </div>
          </div>
          <div
            className="profile-accordion-chevron"
            style={{ transform: showProfileFields ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >▼</div>
        </div>

        {showProfileFields && (
          <div className="profile-accordion-body">
            {[
              { label: t.username, value: profileName, setter: setProfileName, placeholder: 'satoshi', type: 'text', help: t.helpUsername },
              { label: t.displayName, value: profileDisplayName, setter: setProfileDisplayName, placeholder: 'Satoshi Nakamoto', type: 'text', help: t.helpDisplayName },
              { label: t.bio, value: profileBio, setter: setProfileBio, placeholder: t.bioPlaceholder || 'Builder, trader…', type: 'text', help: t.helpBio },
              { label: t.website, value: profileWebsite, setter: setProfileWebsite, placeholder: 'https://...', type: 'url', help: t.helpWebsite },
              { label: t.lightningAddress, value: profileLud16, setter: setProfileLud16, placeholder: 'you@walletofsatoshi.com', type: 'text', help: t.helpLud16 },
            ].map(f => (
              <div key={f.label} className="form-group">
                <div className="profile-field-label">
                  {f.label}
                  {f.help && <span className="field-help-icon" title={f.help}>?</span>}
                </div>
                <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.setter(e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleCreateSubmit} style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}>
        {t.genKeys}
      </button>

      <div className="login-divider" />

      <form className="login-form" onSubmit={handleLoginSubmit}>
        <h3>{t.loginHeader}</h3>
        <input type="password" placeholder={t.nsecPlaceholder} value={loginInput}
          onChange={e => setLoginInput(e.target.value)} autoComplete="off" />
        {loginError && <div className="error-text">{loginError}</div>}
        <button type="submit" disabled={!loginInput.trim()} className="btn-secondary">{t.loginBtn}</button>
      </form>
    </section>
  );
}
