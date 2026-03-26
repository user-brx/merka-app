import { useState, useEffect } from 'react';
import { type NostrEvent } from '../../../components/feed/NoteCard';
import {
  subscribeToNotes,
  subscribeToUserNotes,
  subscribeToFollowingNotes,
  fetchNotesBatch,
} from '../../../services/nostr/nostr';
import { APP_GUID } from '../../../config/constants';

interface Keys { pk: string; sk: Uint8Array; nsec: string; npub: string; }

export function useFeedNotes(keys: Keys, followedPks: Set<string>) {
  const [globalNotes, setGlobalNotes] = useState<NostrEvent[]>([]);
  const [userNotes, setUserNotes] = useState<NostrEvent[]>([]);
  const [followingNotes, setFollowingNotes] = useState<NostrEvent[]>([]);

  const [activeTab, setActiveTab] = useState<'merka' | 'following' | 'mine'>('merka');

  // Pagination time windows — each tab slides back 24h on "load more"
  const [merkaWindowStart, setMerkaWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [followingWindowStart, setFollowingWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [mineWindowStart, setMineWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMerkaTag = (n: NostrEvent) => n.tags.some(tag => tag[0] === 't' && tag[1] === APP_GUID);

  // Initial batch load on mount — relays don't always return history via subscriptions
  useEffect(() => {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const until = Math.floor(Date.now() / 1000);
    fetchNotesBatch({
      since,
      until,
      onEvent: (ev: NostrEvent) => {
        if (!ev.tags.some(tag => tag[0] === 't' && tag[1] === APP_GUID)) return;
        setGlobalNotes(prev => {
          if (prev.some(n => n.id === ev.id)) return prev;
          return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
        });
      },
      onDone: () => {},
    });
  }, []);

  // Global / Merka feed live subscription
  useEffect(() => {
    const since24h = Math.floor(Date.now() / 1000) - 86400;
    const unsub = subscribeToNotes((ev) => {
      setGlobalNotes(prev => {
        if (prev.some(n => n.id === ev.id)) return prev;
        return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
      });
    }, since24h);
    return () => unsub();
  }, []);

  // My posts subscription
  useEffect(() => {
    const myPk = keys.pk;
    const since24h = Math.floor(Date.now() / 1000) - 86400;
    const unsub = subscribeToUserNotes(myPk, (ev) => {
      if (ev.pubkey !== myPk || !hasMerkaTag(ev)) return;
      setUserNotes(prev => {
        if (prev.some(n => n.id === ev.id)) return prev;
        return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 100);
      });
    }, since24h);
    return () => unsub();
  }, [keys]);

  // Following feed subscription — resets when followedPks changes
  useEffect(() => {
    setFollowingNotes([]); // eslint-disable-line react-hooks/set-state-in-effect
    if (!followedPks.size) return;
    const pks = Array.from(followedPks);
    const since24h = Math.floor(Date.now() / 1000) - 86400;
    const unsub = subscribeToFollowingNotes(pks, (ev) => {
      if (!followedPks.has(ev.pubkey) || ev.pubkey === keys.pk || !hasMerkaTag(ev)) return;
      setFollowingNotes(prev => {
        if (prev.some(n => n.id === ev.id)) return prev;
        return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
      });
    }, since24h);
    return () => unsub();
  }, [followedPks, keys.pk]);

  const addGlobalNote = (ev: NostrEvent) => {
    setGlobalNotes(prev => {
      if (prev.some(n => n.id === ev.id)) return prev;
      return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
    });
  };

  const loadMore24h = (tab: 'merka' | 'following' | 'mine') => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const windowStart = tab === 'merka' ? merkaWindowStart : tab === 'following' ? followingWindowStart : mineWindowStart;
    const newWindowStart = windowStart - 86400;
    const authors = tab === 'following' ? Array.from(followedPks) : tab === 'mine' ? [keys.pk] : undefined;
    fetchNotesBatch({
      since: newWindowStart,
      until: windowStart - 1,
      authors,
      onEvent: (ev: NostrEvent) => {
        if (!hasMerkaTag(ev)) return;
        if (tab === 'following' && (!followedPks.has(ev.pubkey) || ev.pubkey === keys.pk)) return;
        if (tab === 'mine' && ev.pubkey !== keys.pk) return;
        const setter = tab === 'merka' ? setGlobalNotes : tab === 'following' ? setFollowingNotes : setUserNotes;
        setter(prev => {
          if (prev.some(n => n.id === ev.id)) return prev;
          return [...prev, ev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      onDone: () => {
        if (tab === 'merka') setMerkaWindowStart(newWindowStart);
        else if (tab === 'following') setFollowingWindowStart(newWindowStart);
        else setMineWindowStart(newWindowStart);
        setIsLoadingMore(false);
      },
    });
  };

  return {
    globalNotes,
    userNotes,
    followingNotes,
    activeTab,
    setActiveTab,
    isLoadingMore,
    hasMerkaTag,
    addGlobalNote,
    loadMore24h,
  };
}
