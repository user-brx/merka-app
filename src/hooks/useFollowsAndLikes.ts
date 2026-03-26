import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import { publishReaction, publishFollowList, fetchFollowList } from '../services/nostr/nostr';
import type { NostrEvent } from '../components/feed/NoteCard';
import type { Keys } from './useNostrAuth';

export function useFollowsAndLikes(
  keys: Keys | null,
  isNewAccountRef: MutableRefObject<boolean>
) {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_liked');
    return s ? new Set(JSON.parse(s)) : new Set();
  });

  const [followedPks, setFollowedPks] = useState<Set<string>>(() => {
    const s = localStorage.getItem('merka_following');
    return s ? new Set(JSON.parse(s)) : new Set();
  });

  // Sync follow list from relay on login — relay is authoritative over localStorage
  useEffect(() => {
    if (!keys) return;
    fetchFollowList(keys.pk).then(pks => {
      // null = relay timeout → keep localStorage fallback
      // isNewAccount = new acct has no kind:3 yet → don't clear the auto-follow
      if (pks === null || isNewAccountRef.current) return;
      setFollowedPks(new Set(pks));
      localStorage.setItem('merka_following', JSON.stringify(pks));
    });
  }, [keys, isNewAccountRef]);

  const handleLike = useCallback(async (note: NostrEvent) => {
    if (!keys || likedIds.has(note.id)) return;
    const next = new Set(likedIds);
    next.add(note.id);
    setLikedIds(next);
    localStorage.setItem('merka_liked', JSON.stringify(Array.from(next)));
    await publishReaction(keys.sk, note.id, note.pubkey);
  }, [keys, likedIds]);

  const handleFollow = useCallback(async (pubkey: string) => {
    if (!keys || followedPks.has(pubkey)) return;
    const next = new Set(followedPks);
    next.add(pubkey);
    setFollowedPks(next);
    localStorage.setItem('merka_following', JSON.stringify(Array.from(next)));
    await publishFollowList(keys.sk, Array.from(next));
  }, [keys, followedPks]);

  const handleUnfollow = useCallback(async (pubkey: string) => {
    if (!keys || !followedPks.has(pubkey)) return;
    const next = new Set(followedPks);
    next.delete(pubkey);
    setFollowedPks(next);
    localStorage.setItem('merka_following', JSON.stringify(Array.from(next)));
    await publishFollowList(keys.sk, Array.from(next));
  }, [keys, followedPks]);

  const clearFollowsAndLikes = () => {
    setFollowedPks(new Set());
    localStorage.removeItem('merka_following');
    setLikedIds(new Set());
    localStorage.removeItem('merka_liked');
  };

  return {
    likedIds,
    followedPks,
    setFollowedPks,
    handleLike,
    handleFollow,
    handleUnfollow,
    clearFollowsAndLikes,
  };
}
