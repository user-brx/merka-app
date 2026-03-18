import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createKeys, publishReaction,
  publishFollowList, publishProfile, fetchProfile,
  loginWithKey,
  fetchFollowList, fetchDMPartners,
  fetchNip65Relays, updateRelays, subscribeToIncomingDMs
} from './services/nostr/nostr';
import { MERKA_PUBKEY } from './config/constants';
import { nip19 } from 'nostr-tools';
import { translations, type LangCode } from './i18n/translations';
import { type NostrEvent, AuthorProfile } from './components/feed/NoteCard';
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

import { ProfilePanel } from './pages/Feed/ProfilePanel';
import { ZapModal } from './pages/Feed/ZapModal';
import { KeyWarningModal } from './pages/Feed/KeyWarningModal';
import { ChatHistoryPanel, type ChatContact } from './pages/Feed/ChatHistoryPanel';
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

  const [myProfile, setMyProfile] = useState<ProfileData>({});

  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


const [showRelayPanel, setShowRelayPanel] = useState(false);
  const relayPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (relayPanelRef.current && !relayPanelRef.current.contains(event.target as Node)) {
        setShowRelayPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { relayStates, connectedRelays } = useRelays();
  const [showRelaySettings, setShowRelaySettings] = useState(false);

  const [loginError, setLoginError] = useState('');



  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_liked'); return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [followedPks, setFollowedPks] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_following'); return s ? new Set(JSON.parse(s)) : new Set();
  });

  // Saved DM contacts (for history panel)
  const [chatContacts, setChatContacts] = useState<ChatContact[]>(() => {
    try {
      const s = localStorage.getItem('merka_contacts');
      if (!s) return [];
      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (c): c is ChatContact =>
          typeof c === 'object' && c !== null &&
          typeof c.pubkey === 'string' && /^[0-9a-f]{64}$/.test(c.pubkey) &&
          typeof c.npub === 'string' && c.npub.startsWith('npub1') &&
          typeof c.label === 'string'
      );
    } catch { return []; }
  });

  // Modals
  const [chatTarget, setChatTarget] = useState<ChatContact | null>(null);
  const chatTargetRef = useRef<ChatContact | null>(null);
  useEffect(() => { chatTargetRef.current = chatTarget; }, [chatTarget]);



  // Ref so the DM listener always reads the latest timestamps without re-subscribing
  const lastReadTsRef = useRef<Record<string, number>>({});

  const [zapTarget, setZapTarget] = useState<{ pubkey: string, npub: string, noteId?: string, lud16?: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutNostr, setShowAboutNostr] = useState(false);
  const [showAboutMerka, setShowAboutMerka] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [newAccountNsec, setNewAccountNsec] = useState('');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [profilePopupTarget, setProfilePopupTarget] = useState<{ pubkey: string; npub: string } | null>(null);

  const [unreadPks, setUnreadPks] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_unread');
    return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>(() => {
    const s = localStorage.getItem('merka_read_ts');
    const parsed = s ? JSON.parse(s) : {};
    return parsed;
  });
  useEffect(() => { lastReadTsRef.current = lastReadTimestamps; }, [lastReadTimestamps]);

  const [discoverySince] = useState(() => Math.floor(Date.now() / 1000) - 86400); // Check last 24h



  const [globalToast, setGlobalToast] = useState('');
  const showGlobalToast = useCallback((msg: string) => {
    setGlobalToast(msg); setTimeout(() => setGlobalToast(''), 2500);
  }, []);

  useEffect(() => { localStorage.setItem('merka_lang', lang); }, [lang]);

  // Relay health monitoring handled by useRelays()
  // Auto-login with 30-day session expiry handled by useNostrAuth()

  // Fetch my profile
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!keys) { setMyProfile({}); return; }
    fetchProfile(keys.pk, p => setMyProfile(p as ProfileData));
  }, [keys]);

  // On login: restore follow list and DM contact list from Nostr relays
  useEffect(() => {
    if (!keys) return;
    const since24h = Math.floor(Date.now() / 1000) - 86400;

    // Restore NIP-65 Relays
    fetchNip65Relays(keys.pk).then(userRelays => {
      if (userRelays && userRelays.length > 0) {
        updateRelays(userRelays);
      }
    });

    // Restore following list (kind:3) — Nostr is authoritative, replace local state.
    // null = timeout/no relay response → keep localStorage as fallback.
    // [] = kind:3 found but user follows nobody → clear list (user may have unfollowed all).
    fetchFollowList(keys.pk).then(pks => {
      if (pks === null || isNewAccountRef.current) return; // relay failure or new acct — keep existing localStorage list
      setFollowedPks(new Set(pks));
      localStorage.setItem('merka_following', JSON.stringify(pks));
    });

    // Restore DM contacts from last 24h (kind:4)
    fetchDMPartners(keys.sk, since24h).then(partnerPks => {
      if (!partnerPks.length) return;
      setChatContacts(prev => {
        const existing = new Set(prev.map(c => c.pubkey));
        const toAdd = partnerPks.filter(pk => !existing.has(pk));
        if (!toAdd.length) return prev;
        const newContacts = toAdd.map(pk => {
          const npub = nip19.npubEncode(pk);
          return { pubkey: pk, npub, label: npub.slice(0, 12) + '...' };
        });
        const next = [...prev, ...newContacts];
        localStorage.setItem('merka_contacts', JSON.stringify(next));
        // Fetch display names for new contacts
        toAdd.forEach(pk => {
          fetchProfile(pk, (p: Record<string, string>) => {
            const name = p?.display_name || p?.name;
            if (!name) return;
            setChatContacts(c => {
              const updated = c.map(x => x.pubkey === pk ? { ...x, label: name } : x);
              localStorage.setItem('merka_contacts', JSON.stringify(updated));
              return updated;
            });
          });
        });
        return next;
      });
    });
  }, [keys]);





  // Real-time DM Listener (Notifications)
  useEffect(() => {
    if (!keys) return;
    const unsub = subscribeToIncomingDMs(keys.sk, (ev) => {
      // Ignore messages sent by me
      if (ev.pubkey === keys.pk) return;

      // Ignore if already read: message timestamp <= last time I opened this conversation
      const readAt = lastReadTsRef.current[ev.pubkey];
      if (readAt && ev.created_at <= readAt) return;

      // Ignore if currently chatting with this person (they see messages in real-time)
      if (chatTargetRef.current?.pubkey === ev.pubkey) return;

      // Mark as unread
      setUnreadPks(prev => {
        if (prev.has(ev.pubkey)) return prev;
        const next = new Set(prev);
        next.add(ev.pubkey);
        localStorage.setItem('merka_unread', JSON.stringify(Array.from(next)));
        return next;
      });

      // Auto-add to contacts
      setChatContacts(prev => {
        if (prev.some(c => c.pubkey === ev.pubkey)) return prev;
        const npub = nip19.npubEncode(ev.pubkey);
        const label = npub.slice(0, 12) + '...';
        const next = [...prev, { pubkey: ev.pubkey, npub, label }];
        localStorage.setItem('merka_contacts', JSON.stringify(next));
        return next;
      });

      showGlobalToast(t.newMsgReceived || "Nova mensagem recebida!");
    }, discoverySince);
    return () => unsub();
  }, [keys, t.newMsgReceived, showGlobalToast, discoverySince]);

  // Clear unread when opening chat
  // Mark conversation as read when chat opens
  useEffect(() => {
    if (!chatTarget) return;
    const now = Math.floor(Date.now() / 1000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastReadTimestamps(prev => {
      const next = { ...prev, [chatTarget.pubkey]: now };
      localStorage.setItem('merka_read_ts', JSON.stringify(next));
      return next;
    });
    setUnreadPks(prev => {
      if (!prev.has(chatTarget.pubkey)) return prev;
      const next = new Set(prev);
      next.delete(chatTarget.pubkey);
      localStorage.setItem('merka_unread', JSON.stringify(Array.from(next)));
      return next;
    });
  }, [chatTarget]);

  const addContact = (pubkey: string, npub: string, label: string) => {
    setChatContacts(prev => {
      if (prev.some(c => c.pubkey === pubkey)) return prev;
      const next = [...prev, { pubkey, npub, label }];
      localStorage.setItem('merka_contacts', JSON.stringify(next));
      return next;
    });
  };


  const handleCreateAccount = async (pData: ProfileSetupData) => {
    isNewAccountRef.current = true;
    const newKeys = createKeys();
    setKeys(newKeys);
    setLoginError('');
    setNewAccountNsec(newKeys.nsec);
    
    // Pass to hook for NIP-49 protection flow
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
    // Auto-follow Merka account
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
      // Let user choose NIP-49 protection before persisting to localStorage
      login(account, false);
    } else setLoginError(t.invalidKey);
  };

  const handleLogout = () => {
    // Let hook clean up storage
    logout();

    // Clear all user-specific state and localStorage so the next user starts fresh
    setChatContacts([]);
    localStorage.removeItem('merka_contacts');
    setUnreadPks(new Set());
    localStorage.removeItem('merka_unread');
    setLastReadTimestamps({});
    localStorage.removeItem('merka_read_ts');
    setFollowedPks(new Set());
    localStorage.removeItem('merka_following');
    setLikedIds(new Set());
    localStorage.removeItem('merka_liked');

    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    });

    // Reset UI state
    setMyProfile({});
    setLoginError('');
    setShowChatHistory(false);
    setShowProfileModal(false);
    setZapTarget(null);
  };



  const handleLike = useCallback(async (note: NostrEvent) => {
    if (!keys || likedIds.has(note.id)) return;
    const next = new Set(likedIds); next.add(note.id);
    setLikedIds(next);
    localStorage.setItem('merka_liked', JSON.stringify(Array.from(next)));
    await publishReaction(keys.sk, note.id, note.pubkey);
  }, [keys, likedIds]);

  const handleFollow = useCallback(async (pubkey: string) => {
    if (!keys || followedPks.has(pubkey)) return;
    const next = new Set(followedPks); next.add(pubkey);
    setFollowedPks(next);
    localStorage.setItem('merka_following', JSON.stringify(Array.from(next)));
    await publishFollowList(keys.sk, Array.from(next));
  }, [keys, followedPks]);

  const handleUnfollow = useCallback(async (pubkey: string) => {
    if (!keys || !followedPks.has(pubkey)) return;
    const next = new Set(followedPks); next.delete(pubkey);
    setFollowedPks(next);
    localStorage.setItem('merka_following', JSON.stringify(Array.from(next)));
    await publishFollowList(keys.sk, Array.from(next));
  }, [keys, followedPks]);

  const openChat = (pubkey: string, npub: string) => {
    if (!keys) return;
    const shortLabel = npub.slice(0, 12) + '...';
    addContact(pubkey, npub, shortLabel);
    setChatTarget({ pubkey, npub, label: shortLabel });
    // Fetch real display name asynchronously
    fetchProfile(pubkey, (p) => {
      const name = (p as ProfileData).display_name || (p as ProfileData).name;
      if (name) {
        setChatTarget(prev => prev?.pubkey === pubkey ? { ...prev, label: name } : prev);
        setChatContacts(prev => {
          const updated = prev.map(c => c.pubkey === pubkey ? { ...c, label: name } : c);
          localStorage.setItem('merka_contacts', JSON.stringify(updated));
          return updated;
        });
      }
    });
  };



  const isRTL = lang === 'ar';

  // Allow body to scroll when not logged in so accordion fields are accessible on small screens
  useEffect(() => {
    document.body.style.overflow = keys ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'hidden'; };
  }, [keys]);

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
        <KeyWarningModal t={t} nsec={newAccountNsec} onClose={() => { setShowKeyWarning(false); setNewAccountNsec(''); }} />
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
          onOpenDonate={() => { setShowAboutMerka(false); setShowDonate(true); }}
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

      {/* Navigation bar */}
      <header className="top-nav">
        <div className="nav-top-line">
          <div className="brand" onClick={() => setShowAboutMerka(true)} style={{ cursor: 'pointer' }} title={t.aboutMerka}>
            <div className="brand-icon"><GlobeIcon size={20} /></div>
          </div>

          {/* ── Linha 1: globo, ajuda, btc, apoiar, idioma, chat, rede, perfil ── */}
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
                      onMouseOver={(e) => { if (lang !== l) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseOut={(e) => { if (lang !== l) e.currentTarget.style.background = 'transparent' }}
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

      <main className={`main-content-layout${!keys ? ' auth-mode' : ''}`}>
        <div className={`feed-and-entry${!keys ? ' auth-mode' : ''}`}>
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
