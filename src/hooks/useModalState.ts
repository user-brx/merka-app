import { useState } from 'react';

interface ZapTarget { pubkey: string; npub: string; noteId?: string; lud16?: string; }
interface ProfilePopupTarget { pubkey: string; npub: string; }

export function useModalState() {
  const [showRelayPanel, setShowRelayPanel] = useState(false);
  const [showRelaySettings, setShowRelaySettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutNostr, setShowAboutNostr] = useState(false);
  const [showAboutMerka, setShowAboutMerka] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [newAccountNsec, setNewAccountNsec] = useState('');
  const [zapTarget, setZapTarget] = useState<ZapTarget | null>(null);
  const [profilePopupTarget, setProfilePopupTarget] = useState<ProfilePopupTarget | null>(null);

  const closeKeyWarning = () => { setShowKeyWarning(false); setNewAccountNsec(''); };
  const openAboutMerka = () => setShowAboutMerka(true);
  const openDonateFromAbout = () => { setShowAboutMerka(false); setShowDonate(true); };

  const resetModalsOnLogout = () => {
    setShowChatHistory(false);
    setShowProfileModal(false);
    setZapTarget(null);
  };

  return {
    showRelayPanel, setShowRelayPanel,
    showRelaySettings, setShowRelaySettings,
    showProfileModal, setShowProfileModal,
    showAboutNostr, setShowAboutNostr,
    showAboutMerka, setShowAboutMerka,
    showDonate, setShowDonate,
    showWalletGuide, setShowWalletGuide,
    showKeyWarning, setShowKeyWarning,
    showChatHistory, setShowChatHistory,
    showNetworkPanel, setShowNetworkPanel,
    newAccountNsec, setNewAccountNsec,
    zapTarget, setZapTarget,
    profilePopupTarget, setProfilePopupTarget,
    closeKeyWarning,
    openAboutMerka,
    openDonateFromAbout,
    resetModalsOnLogout,
  };
}
