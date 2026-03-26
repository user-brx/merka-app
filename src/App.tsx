import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createKeys,
  publishProfile, fetchProfile,
  loginWithKey,
  fetchNip65Relays, updateRelays, publishFollowList
} from './services/nostr/nostr';
import { MERKA_PUBKEY } from './config/constants';
import { translations, type LangCode } from './i18n/translations';
import { AuthorProfile } from './components/feed/NoteCard';
import { ChatPanel } from './components/chat/ChatPanel';
import { LoginScreen, type ProfileSetupData } from './pages/Login/Login';
import { AboutNostr } from './components/modals/about/AboutNostr';
import { AboutMerka } from './components/modals/about/AboutMerka';
import { DonateModal } from './components/modals/donate/DonateModal';
import { WalletGuide } from './components/modals/donate/WalletGuide';
import { NetworkListModal } from './components/modals/network/NetworkListModal';
import { RelaySettingsModal } from './components/modals/network/RelaySettingsModal';
import { KeyProtectionModal } from './components/modals/security/KeyProtectionModal';
import { UnlockKeyModal } from './components/modals/security/UnlockKeyModal';
import { useNostrAuth } from './hooks/useNostrAuth';
import { useRelays } from './hooks/useRelays';
import { useFollowsAndLikes } from './hooks/useFollowsAndLikes';
import { useDMManager } from './hooks/useDMManager';
import { useModalState } from './hooks/useModalState';

import { ProfilePanel } from './pages/Feed/ProfilePanel';
import { ZapModal } from './pages/Feed/ZapModal';
import { KeyWarningModal } from './pages/Feed/KeyWarningModal';
import { ChatHistoryPanel } from './pages/Feed/ChatHistoryPanel';
import { Feed } from './pages/Feed/Feed';
import { ProfileIcon, ChatHistoryIcon, GlobeIcon, InfoIcon, BitcoinIcon, DonateIcon, UsersIcon, ChevronDownIcon, XIcon, ZapIcon } from './components/ui/icons';

// ── Profile Panel ─────────────────────────────────────────
interface ProfileData { name?: string; display_name?: string; about?: string; picture?: string; website?: string; lud16?: string; nip05?: string; }

// ── Country Acronyms Mapping & Native Names ─────────────
const langToCountry: Record<LangCode, string> = {
  en: 'US', pt: 'BR', es: 'ES', ar: 'SA', de: 'DE',
  fa: 'IR', fr: 'FR', hi: 'IN', it: 'IT', ja: 'JP',
  ru: 'RU', tr: 'TR', uk: 'UA', vi: 'VN', zh: 'CN'
};

const langNativeNames: Record<LangCode, string> = {
  en: 'English', pt: 'Português', es: 'Español', ar: 'العربية', de: 'Deutsch',
  fa: 'فارسی', fr: 'Français', hi: 'हिन्दी', it: 'Italiano', ja: '日本語',
  ru: 'Русский', tr: 'Türkçe', uk: 'Українська', vi: 'Tiếng Việt', zh: '中文'
};

// ── Main App ──────────────────────────────────────────────
function App() {
  const [lang, setLang] = useState<LangCode>(() => (localStorage.getItem('merka_lang') as LangCode) || 'en');
  const t = translations[lang];

  const {
    keys, setKeys, isNewAccountRef,
    showKeyProtection,
    showUnlockKey,
    unlockError, handleUnlockKey, handleUseOtherKey, handleProtectKey,
    login, logout
  } = useNostrAuth();

  const {
    likedIds, followedPks, setFollowedPks,
    handleLike, handleFollow, handleUnfollow, clearFollowsAndLikes,
  } = useFollowsAndLikes(keys, isNewAccountRef);

  const [globalToast, setGlobalToast] = useState('');
  const showGlobalToast = useCallback((msg: string) => {
    setGlobalToast(msg); setTimeout(() => setGlobalToast(''), 2500);
  }, []);

  const {
    chatContacts, chatTarget, setChatTarget, chatInitialMessages,
    unreadPks, openChat, clearDMs,
  } = useDMManager(keys, showGlobalToast, t.newMsgReceived || 'Nova mensagem recebida!');

  const {
    showRelayPanel, setShowRelayPanel,
    showRelaySettings, setShowRelaySettings,
    showProfileModal, setShowProfileModal,
    showAboutNostr, setShowAboutNostr,
    showAboutMerka, setShowAboutMerka,
    showDonate, setShowDonate,
    showWalletGuide, setShowWalletGuide,
    showKeyWarning,
    showChatHistory, setShowChatHistory,
    showNetworkPanel, setShowNetworkPanel,
    newAccountNsec, setNewAccountNsec,
    zapTarget, setZapTarget,
    profilePopupTarget, setProfilePopupTarget,
    closeKeyWarning, openDonateFromAbout, resetModalsOnLogout,
  } = useModalState();

  const [myProfile, setMyProfile] = useState<ProfileData>({});
  const [loginError, setLoginError] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const relayPanelRef = useRef<HTMLDivElement>(null);

  const { relayStates, connectedRelays } = useRelays();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) setIsLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (relayPanelRef.current && !relayPanelRef.current.contains(e.target as Node)) setShowRelayPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowRelayPanel]);

  useEffect(() => { localStorage.setItem('merka_lang', lang); }, [lang]);

  // Fetch my profile on login
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!keys) { setMyProfile({}); return; }
    fetchProfile(keys.pk, p => setMyProfile(p as ProfileData));
  }, [keys]);

  // Restore NIP-65 relays on login
  useEffect(() => {
    if (!keys) return;
    fetchNip65Relays(keys.pk).then(userRelays => {
      if (userRelays && userRelays.length > 0) updateRelays(userRelays);
    });
  }, [keys]);

  // Allow body to scroll when not logged in so accordion fields are accessible on small screens
  useEffect(() => {
    document.body.style.overflow = keys ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'hidden'; };
  }, [keys]);

  const handleCreateAccount = async (pData: ProfileSetupData) => {
    isNewAccountRef.current = true;
    const newKeys = createKeys();
    setKeys(newKeys);
    setLoginError('');
    setNewAccountNsec(newKeys.nsec);
    login(newKeys, true);

    const hasExtra = pData.name || pData.display_name || pData.about || pData.website || pData.lud16;
    if (hasExtra) {
      const cleanData: ProfileData = {
        name: pData.name || undefined,
        display_name: pData.display_name || undefined,
        about: pData.about || undefined,
        website: pData.website || undefined,
        lud16: pData.lud16 || undefined,
      };
      await publishProfile(newKeys.sk, cleanData);
      setMyProfile(cleanData);
    }
    const nextFollow = new Set([MERKA_PUBKEY]);
    setFollowedPks(nextFollow);
    localStorage.setItem('merka_following', JSON.stringify(Array.from(nextFollow)));
    publishFollowList(newKeys.sk, Array.from(nextFollow));
  };

  const handleLogin = (keyInput: string) => {
    const account = loginWithKey(keyInput);
    if (account) {
      setKeys(account);
      setLoginError('');
      login(account, false);
    } else setLoginError(t.invalidKey);
  };

  const handleLogout = () => {
    logout();
    clearFollowsAndLikes();
    clearDMs();
    resetModalsOnLogout();
    setMyProfile({});
    setLoginError('');
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    });
  };

  const isRTL = lang === 'ar';

  return (
    <div className={`app-container${!keys ? ' auth-mode' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {globalToast && <div className="toast">{globalToast}</div>}

      {/* Modals */}
      {showKeyProtection && (
        <KeyProtectionModal
          t={t}
          onProtect={pw => handleProtectKey(pw)}
          onSkip={() => handleProtectKey(null)}
        />
      )}
      {showUnlockKey && (
        <UnlockKeyModal
          t={t}
          onUnlock={handleUnlockKey}
          onUseOtherKey={handleUseOtherKey}
          error={unlockError}
        />
      )}
      {showKeyWarning && (
        <KeyWarningModal t={t} nsec={newAccountNsec} onClose={closeKeyWarning} />
      )}
      {showProfileModal && keys && (
        <ProfilePanel
          t={t}
          keys={keys}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(p) => setMyProfile(p)}
          onToast={showGlobalToast}
          onLogout={() => { setShowProfileModal(false); handleLogout(); }}
        />
      )}
      {zapTarget && (
        <ZapModal
          t={t}
          targetPubkey={zapTarget.pubkey}
          targetNpub={zapTarget.npub}
          noteId={zapTarget.noteId}
          lud16={zapTarget.lud16}
          myKeys={keys}
          onClose={() => setZapTarget(null)}
        />
      )}
      {showAboutNostr && (
        <AboutNostr lang={lang} onClose={() => setShowAboutNostr(false)} />
      )}
      {showAboutMerka && (
        <AboutMerka
          t={t}
          onClose={() => setShowAboutMerka(false)}
          onOpenDonate={openDonateFromAbout}
        />
      )}
      {showDonate && (
        <DonateModal lang={lang} onClose={() => setShowDonate(false)} />
      )}
      {showWalletGuide && (
        <WalletGuide lang={lang} onClose={() => setShowWalletGuide(false)} />
      )}
      {showRelaySettings && (
        <RelaySettingsModal t={t} keys={keys} onClose={() => setShowRelaySettings(false)} />
      )}
      {showChatHistory && keys && (
        <ChatHistoryPanel
          t={t}
          contacts={chatContacts}
          unreadPks={unreadPks}
          onOpenChat={c => openChat(c.pubkey, c.npub)}
          onClose={() => setShowChatHistory(false)}
        />
      )}
      {showNetworkPanel && keys && (
        <NetworkListModal
          t={t}
          myKeys={keys}
          followedPks={followedPks}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onOpenChat={(pk, npub) => openChat(pk, npub)}
          onOpenZap={(pk, npub, noteId, lud16) => setZapTarget({ pubkey: pk, npub, noteId, lud16 })}
          onClose={() => setShowNetworkPanel(false)}
        />
      )}
      {profilePopupTarget && keys && (
        <AuthorProfile
          pubkey={profilePopupTarget.pubkey}
          npub={profilePopupTarget.npub}
          t={t}
          onClose={() => setProfilePopupTarget(null)}
          onFollow={() => { handleFollow(profilePopupTarget.pubkey); setProfilePopupTarget(null); }}
          onUnfollow={() => { handleUnfollow(profilePopupTarget.pubkey); setProfilePopupTarget(null); }}
          onChat={() => { openChat(profilePopupTarget.pubkey, profilePopupTarget.npub); setProfilePopupTarget(null); }}
          onZap={() => { setZapTarget({ pubkey: profilePopupTarget.pubkey, npub: profilePopupTarget.npub }); setProfilePopupTarget(null); }}
          isFollowed={followedPks.has(profilePopupTarget.pubkey)}
          hasKeys={!!keys}
        />
      )}

      <main className={`main-content-layout${!keys ? ' auth-mode' : ''}`}>
        <div className={`feed-and-entry${!keys ? ' auth-mode' : ''}`}>
          {/* Navigation bar */}
          <header className="top-nav">
            <div className="nav-top-line">
              <div className="brand" onClick={() => setShowAboutMerka(true)} style={{ cursor: 'pointer' }} title={t.aboutMerka}>
                <div className="brand-icon"><GlobeIcon size={20} /></div>
              </div>

              <div className="nav-controls nav-primary-row">
                <button className="btn-icon nav-info-btn" onClick={() => setShowAboutNostr(true)} title={t.whatIsNostr}>
                  <InfoIcon size={18} />
                </button>
                <button className="btn-icon nav-info-btn" onClick={() => setShowWalletGuide(true)} title={t.walletGuide}>
                  <BitcoinIcon size={18} />
                </button>
                <button className="btn-icon nav-info-btn" onClick={() => setShowDonate(true)} title={t.donate}>
                  <DonateIcon size={18} />
                </button>

                {/* Idioma */}
                <div ref={langDropdownRef} style={{ position: 'relative' }}>
                  <button
                    className="lang-select-inline"
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'space-between', padding: '0.13rem 0.3rem', border: '1px solid var(--border-color)', borderRadius: '5px', background: 'var(--btn-base)', color: 'var(--text-main)', fontSize: '0.58rem', minWidth: '42px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {lang.toUpperCase()}
                    </span>
                    <ChevronDownIcon size={8} />
                  </button>
                  {isLangOpen && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#070d1a', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1000, display: 'flex', flexDirection: 'column', minWidth: '40px', padding: '3px', boxShadow: '0 12px 28px rgba(0,0,0,0.9)', maxHeight: '400px', overflowY: 'auto' }}>
                      {(Object.keys(langToCountry) as LangCode[]).map((l) => (
                        <button
                          key={l}
                          className="lang-dropdown-item"
                          onClick={() => { setLang(l as LangCode); setIsLangOpen(false); }}
                          style={{ background: lang === l ? 'rgba(59, 130, 246, 0.18)' : 'transparent', border: 'none', color: lang === l ? 'var(--primary)' : 'var(--text-main)', padding: '3px 6px', textAlign: 'left', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '0.62rem', transition: 'all 0.15s', flexShrink: 0 }}
                          onMouseOver={(e) => { if (lang !== l) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseOut={(e) => { if (lang !== l) e.currentTarget.style.background = 'transparent'; }}
                          title={langNativeNames[l]}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relay status */}
                <div ref={relayPanelRef} style={{ position: 'relative' }}>
                  <button
                    className="relay-status-btn"
                    onClick={() => setShowRelayPanel(v => !v)}
                    title={relayStates.map(r =>
                      `${r.status === 'connected' ? '🟢' : r.status === 'connecting' ? '🟡' : '🔴'} ${r.name}`
                    ).join('\n')}
                  >
                    <span className={`status-dot ${connectedRelays > 0 ? 'online' : 'offline'}`} />
                    <span className="connected-label">
                      {connectedRelays > 0
                        ? `${connectedRelays}/${relayStates.length} ${t.connected}`
                        : t.listening}
                    </span>
                  </button>
                  {showRelayPanel && (
                    <div className="relay-panel" onClick={e => e.stopPropagation()}>
                      <div className="relay-panel-header">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><ZapIcon size={14} /> Nostr Relays</span>
                        <button className="btn-icon" onClick={() => setShowRelayPanel(false)} style={{ padding: '.2rem .4rem' }}><XIcon size={14} /></button>
                      </div>
                      {relayStates.map(r => (
                        <div key={r.url} className="relay-panel-row">
                          <span className={`relay-status-dot relay-${r.status}`} />
                          <div className="relay-panel-info">
                            <span className="relay-panel-name">{r.name}</span>
                            <span className="relay-panel-url">{r.url.replace('wss://', '')}</span>
                          </div>
                          <span className={`relay-panel-badge relay-badge-${r.status}`}>
                            {r.status === 'connected' ? '✓' : r.status === 'connecting' ? '…' : '✕'}
                          </span>
                        </div>
                      ))}
                      <button onClick={() => { setShowRelayPanel(false); setShowRelaySettings(true); }} style={{ width: '100%', marginTop: '0.8rem', background: 'var(--primary)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <span>⚙️</span> {t.relaySettings || 'Relay Settings'}
                      </button>
                    </div>
                  )}
                </div>

                {keys && (
                  <>
                    <div className="nav-sep" />
                    <button className="btn-icon" onClick={() => setShowChatHistory(true)} title={t.chatHistoryTitle} style={{ position: 'relative' }}>
                      <ChatHistoryIcon />
                      {unreadPks.size > 0 && (
                        <span style={{
                          position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                          background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-color)'
                        }} />
                      )}
                    </button>
                    <button className="btn-profile-sm" onClick={() => setShowNetworkPanel(true)} title={`${t.followers}/${t.following}`}>
                      <UsersIcon />
                    </button>
                    <button className="btn-profile-sm" onClick={() => setShowProfileModal(true)} title={t.profile}>
                      <ProfileIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {!keys ? (
            <LoginScreen
              t={t}
              loginError={loginError}
              onLogin={handleLogin}
              onCreateAccount={handleCreateAccount}
            />
          ) : (
            <Feed
              t={t}
              lang={lang}
              keys={keys}
              friendlyName={myProfile.display_name || myProfile.name}
              followedPks={followedPks}
              setFollowedPks={setFollowedPks}
              likedIds={likedIds}
              showGlobalToast={showGlobalToast}
              onLike={handleLike}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onOpenChat={openChat}
              onOpenZap={(pubkey, npub, noteId, lud16) => setZapTarget({ pubkey, npub, noteId, lud16 })}
            />
          )}
        </div>
        {chatTarget && keys && (
          <aside className="app-aside" onClick={() => setChatTarget(null)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%' }}>
              <ChatPanel
                t={t}
                myKeys={keys}
                targetPubkey={chatTarget.pubkey}
                targetLabel={chatTarget.label}
                cachedMessages={chatInitialMessages}
                onClose={() => setChatTarget(null)}
                onOpenZap={(pk, npub, noteId, lud16) => setZapTarget({ pubkey: pk, npub, noteId, lud16 })}
                onOpenProfile={(pk, npub) => setProfilePopupTarget({ pubkey: pk, npub })}
              />
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;
