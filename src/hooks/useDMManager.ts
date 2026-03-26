import { useState, useEffect, useRef, useCallback } from 'react';
import { nip19 } from 'nostr-tools';
import { fetchDMPartners, subscribeToIncomingDMs, fetchProfile } from '../services/nostr/nostr';
import type { Keys } from './useNostrAuth';
import type { ChatContact } from '../pages/Feed/ChatHistoryPanel';
import type { ChatMessage } from '../components/chat/ChatPanel';

export function useDMManager(
  keys: Keys | null,
  showGlobalToast: (msg: string) => void,
  newMsgToast: string,
) {
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

  const [chatTarget, setChatTarget] = useState<ChatContact | null>(null);
  const chatTargetRef = useRef<ChatContact | null>(null);
  useEffect(() => { chatTargetRef.current = chatTarget; }, [chatTarget]);

  // Cache of DMs received in real-time while chat is closed.
  // Some relays forward kind:1059 in real-time but don't store them — this ref survives re-renders.
  const dmCacheRef = useRef<Map<string, ChatMessage[]>>(new Map());

  const [chatInitialMessages, setChatInitialMessages] = useState<ChatMessage[] | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatInitialMessages(chatTarget ? dmCacheRef.current.get(chatTarget.pubkey) : undefined);
  }, [chatTarget]);

  const [unreadPks, setUnreadPks] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_unread');
    return s ? new Set(JSON.parse(s)) : new Set();
  });

  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>(() => {
    const s = localStorage.getItem('merka_read_ts');
    return s ? JSON.parse(s) : {};
  });

  // Ref so the DM listener always reads the latest timestamps without re-subscribing
  const lastReadTsRef = useRef<Record<string, number>>({});
  useEffect(() => { lastReadTsRef.current = lastReadTimestamps; }, [lastReadTimestamps]);

  // 3 days back — covers the NIP-17 randomization window of up to 48h
  const [discoverySince] = useState(() => Math.floor(Date.now() / 1000) - 259200);

  // Restore DM contacts from relay on login
  useEffect(() => {
    if (!keys) return;
    const since24h = Math.floor(Date.now() / 1000) - 86400;
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

  // Real-time DM listener — reconnects on visibilitychange (iOS kills WebSockets when backgrounded)
  useEffect(() => {
    if (!keys) return;

    const handleDMEvent = (ev: { id: string; pubkey: string; content: string; created_at: number; tags: string[][] }) => {
      if (ev.pubkey === keys.pk) return;
      const readAt = lastReadTsRef.current[ev.pubkey];
      if (readAt && ev.created_at <= readAt) return;

      // Cache message so ChatPanel can pre-populate when opened
      const cached = dmCacheRef.current.get(ev.pubkey) ?? [];
      if (!cached.some(m => m.id === ev.id)) {
        dmCacheRef.current.set(
          ev.pubkey,
          [...cached, { id: ev.id, fromMe: false, text: ev.content, created_at: ev.created_at }].slice(-200)
        );
      }

      if (chatTargetRef.current?.pubkey === ev.pubkey) return;

      setUnreadPks(prev => {
        if (prev.has(ev.pubkey)) return prev;
        const next = new Set(prev);
        next.add(ev.pubkey);
        localStorage.setItem('merka_unread', JSON.stringify(Array.from(next)));
        return next;
      });

      setChatContacts(prev => {
        const existing = prev.find(c => c.pubkey === ev.pubkey);
        const npub = nip19.npubEncode(ev.pubkey);
        if (!existing) {
          const label = npub.slice(0, 12) + '...';
          const next = [...prev, { pubkey: ev.pubkey, npub, label }];
          localStorage.setItem('merka_contacts', JSON.stringify(next));
          fetchProfile(ev.pubkey, (p: Record<string, string>) => {
            const name = p?.display_name || p?.name;
            if (!name) return;
            setChatContacts(c => {
              const updated = c.map(x => x.pubkey === ev.pubkey ? { ...x, label: name } : x);
              localStorage.setItem('merka_contacts', JSON.stringify(updated));
              return updated;
            });
          });
          return next;
        } else if (existing.label.endsWith('...') && existing.label.length <= 15) {
          fetchProfile(ev.pubkey, (p: Record<string, string>) => {
            const name = p?.display_name || p?.name;
            if (!name) return;
            setChatContacts(c => {
              const updated = c.map(x => x.pubkey === ev.pubkey ? { ...x, label: name } : x);
              localStorage.setItem('merka_contacts', JSON.stringify(updated));
              return updated;
            });
          });
          return prev;
        }
        return prev;
      });

      showGlobalToast(newMsgToast);
    };

    let unsub = subscribeToIncomingDMs(keys.sk, handleDMEvent, discoverySince);

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      unsub();
      const since3days = Math.floor(Date.now() / 1000) - 259200;
      unsub = subscribeToIncomingDMs(keys.sk, handleDMEvent, since3days);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [keys, newMsgToast, showGlobalToast, discoverySince]);

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

  const addContact = useCallback((pubkey: string, npub: string, label: string) => {
    setChatContacts(prev => {
      if (prev.some(c => c.pubkey === pubkey)) return prev;
      const next = [...prev, { pubkey, npub, label }];
      localStorage.setItem('merka_contacts', JSON.stringify(next));
      return next;
    });
  }, []);

  const openChat = useCallback((pubkey: string, npub: string) => {
    if (!keys) return;
    const shortLabel = npub.slice(0, 12) + '...';
    addContact(pubkey, npub, shortLabel);
    setChatTarget({ pubkey, npub, label: shortLabel });
    fetchProfile(pubkey, (p) => {
      const name = (p as { display_name?: string; name?: string }).display_name
        || (p as { display_name?: string; name?: string }).name;
      if (name) {
        setChatTarget(prev => prev?.pubkey === pubkey ? { ...prev, label: name } : prev);
        setChatContacts(prev => {
          const updated = prev.map(c => c.pubkey === pubkey ? { ...c, label: name } : c);
          localStorage.setItem('merka_contacts', JSON.stringify(updated));
          return updated;
        });
      }
    });
  }, [keys, addContact]);

  const clearDMs = () => {
    setChatContacts([]);
    localStorage.removeItem('merka_contacts');
    setUnreadPks(new Set());
    localStorage.removeItem('merka_unread');
    setLastReadTimestamps({});
    localStorage.removeItem('merka_read_ts');
    dmCacheRef.current.clear();
    setChatTarget(null);
  };

  return {
    chatContacts,
    chatTarget,
    setChatTarget,
    chatInitialMessages,
    unreadPks,
    lastReadTimestamps,
    openChat,
    addContact,
    clearDMs,
  };
}
