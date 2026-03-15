import { useState, useEffect, useRef } from 'react';
import { loginWithKey } from '../services/nostr/nostr';
import { nip19 } from 'nostr-tools';
import * as nip49 from 'nostr-tools/nip49';

export type Keys = { sk: Uint8Array; pk: string; nsec: string; npub: string };

export function useNostrAuth() {
  const [keys, setKeys] = useState<Keys | null>(null);
  const isNewAccountRef = useRef(false);
  const [pendingKeyData, setPendingKeyData] = useState<Keys | null>(null);
  const [showKeyProtection, setShowKeyProtection] = useState(false);
  const [showUnlockKey, setShowUnlockKey] = useState(false);
  const [pendingNcryptsec, setPendingNcryptsec] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Auto-login with 30-day session expiry
  useEffect(() => {
    const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    const saved = localStorage.getItem('merka_nsec');
    const savedTs = localStorage.getItem('merka_nsec_ts');
    if (!saved) return;
    
    const expired = savedTs ? (Date.now() - Number(savedTs)) > SESSION_EXPIRY_MS : false;
    if (expired) {
      localStorage.removeItem('merka_nsec');
      localStorage.removeItem('merka_nsec_ts');
      return; 
    }

    if (saved.startsWith('ncryptsec1')) {
      setPendingNcryptsec(saved);
      setShowUnlockKey(true);
      return;
    }
    const a = loginWithKey(saved);
    if (a) setKeys(a);
  }, []);

  const handleUnlockKey = (password: string) => {
    try {
      if (!pendingNcryptsec) throw new Error('No encrypted key found');
      const decryptedSecKeyBytes = nip49.decrypt(pendingNcryptsec, password);
      const decryptedNsec = nip19.nsecEncode(decryptedSecKeyBytes);
      
      const account = loginWithKey(decryptedNsec);
      if (account) {
        setKeys(account);
        setShowUnlockKey(false);
        setUnlockError('');
        localStorage.setItem('merka_nsec_ts', Date.now().toString());
      } else {
        throw new Error('Invalid key after decryption');
      }
    } catch (e: unknown) {
      setUnlockError(e instanceof Error ? e.message : 'Incorrect password');
    }
  };

  const handleUseOtherKey = () => {
    setShowUnlockKey(false);
    localStorage.removeItem('merka_nsec');
    localStorage.removeItem('merka_nsec_ts');
    setPendingNcryptsec('');
  };

  const saveSession = (nsecToSave: string) => {
    localStorage.setItem('merka_nsec', nsecToSave);
    localStorage.setItem('merka_nsec_ts', Date.now().toString());
  };

  const handleProtectKey = (password: string | null) => {
    if (!pendingKeyData) return;
    
    if (password) {
      try {
        const encrypted = nip49.encrypt(pendingKeyData.sk, password);
        saveSession(encrypted);
      } catch (err) {
        console.error('Failed to encrypt key', err);
        return;
      }
    } else {
      saveSession(pendingKeyData.nsec);
    }
    
    setKeys(pendingKeyData);
    setPendingKeyData(null);
    setShowKeyProtection(false);
  };

  const login = (account: Keys, isNew: boolean = false) => {
    isNewAccountRef.current = isNew;
    setPendingKeyData(account);
    setShowKeyProtection(true);
  };

  const logout = () => {
    localStorage.removeItem('merka_nsec');
    localStorage.removeItem('merka_nsec_ts');
    localStorage.removeItem('merka_search_query');
    localStorage.removeItem('merka_search_type');
    setKeys(null);
    setPendingNcryptsec('');
  };

  return {
    keys,
    setKeys,
    isNewAccountRef,
    showKeyProtection,
    showUnlockKey,
    unlockError,
    handleUnlockKey,
    handleUseOtherKey,
    handleProtectKey,
    login,
    logout,
    setShowUnlockKey,
    setShowKeyProtection
  };
}
