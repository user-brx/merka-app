import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowsAndLikes } from './useFollowsAndLikes';
import type { NostrEvent } from '../components/feed/NoteCard';
import { useRef } from 'react';

vi.mock('../services/nostr/nostr', () => ({
  publishReaction: vi.fn().mockResolvedValue(undefined),
  publishFollowList: vi.fn().mockResolvedValue(undefined),
  fetchFollowList: vi.fn().mockResolvedValue(null),
}));

import { publishReaction, publishFollowList, fetchFollowList } from '../services/nostr/nostr';

const KEYS = { sk: new Uint8Array(32), pk: 'aabbcc', nsec: 'nsec1', npub: 'npub1' };

function makeEvent(id = 'ev1', pubkey = 'author1'): NostrEvent {
  return { id, pubkey, content: '', created_at: 1000, kind: 1, tags: [] };
}

function useHook(keysVal = KEYS) {
  const isNewAccountRef = useRef(false);
  return useFollowsAndLikes(keysVal, isNewAccountRef);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useFollowsAndLikes', () => {
  it('initializes with empty sets when localStorage is empty', () => {
    const { result } = renderHook(() => useHook());
    expect(result.current.likedIds.size).toBe(0);
    expect(result.current.followedPks.size).toBe(0);
  });

  it('restores liked ids and followed pks from localStorage', () => {
    localStorage.setItem('merka_liked', JSON.stringify(['ev1', 'ev2']));
    localStorage.setItem('merka_following', JSON.stringify(['pk1']));
    const { result } = renderHook(() => useHook());
    expect(result.current.likedIds.has('ev1')).toBe(true);
    expect(result.current.followedPks.has('pk1')).toBe(true);
  });

  it('handleLike adds id to likedIds and calls publishReaction', async () => {
    const { result } = renderHook(() => useHook());
    const note = makeEvent('ev1');
    await act(async () => { await result.current.handleLike(note); });
    expect(result.current.likedIds.has('ev1')).toBe(true);
    expect(publishReaction).toHaveBeenCalledWith(KEYS.sk, 'ev1', 'author1');
  });

  it('handleLike is idempotent — does not re-publish if already liked', async () => {
    const { result } = renderHook(() => useHook());
    const note = makeEvent('ev1');
    await act(async () => { await result.current.handleLike(note); });
    await act(async () => { await result.current.handleLike(note); });
    expect(publishReaction).toHaveBeenCalledTimes(1);
  });

  it('handleFollow adds pubkey and calls publishFollowList', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => { await result.current.handleFollow('pk1'); });
    expect(result.current.followedPks.has('pk1')).toBe(true);
    expect(publishFollowList).toHaveBeenCalledWith(KEYS.sk, expect.arrayContaining(['pk1']));
  });

  it('handleFollow is idempotent — does not re-publish if already following', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => { await result.current.handleFollow('pk1'); });
    await act(async () => { await result.current.handleFollow('pk1'); });
    expect(publishFollowList).toHaveBeenCalledTimes(1);
  });

  it('handleUnfollow removes pubkey and calls publishFollowList', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => { await result.current.handleFollow('pk1'); });
    await act(async () => { await result.current.handleUnfollow('pk1'); });
    expect(result.current.followedPks.has('pk1')).toBe(false);
    expect(publishFollowList).toHaveBeenCalledTimes(2);
  });

  it('handleUnfollow is a no-op when not following', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => { await result.current.handleUnfollow('pk1'); });
    expect(publishFollowList).not.toHaveBeenCalled();
  });

  it('clearFollowsAndLikes resets state and localStorage', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => {
      await result.current.handleFollow('pk1');
      await result.current.handleLike(makeEvent('ev1'));
    });
    act(() => result.current.clearFollowsAndLikes());
    expect(result.current.followedPks.size).toBe(0);
    expect(result.current.likedIds.size).toBe(0);
    expect(localStorage.getItem('merka_following')).toBeNull();
    expect(localStorage.getItem('merka_liked')).toBeNull();
  });

  it('syncs follow list from relay on login when fetchFollowList resolves', async () => {
    vi.mocked(fetchFollowList).mockResolvedValueOnce(['relay_pk1', 'relay_pk2']);
    const { result } = renderHook(() => useHook());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.followedPks.has('relay_pk1')).toBe(true);
  });

  it('keeps localStorage fallback when fetchFollowList returns null', async () => {
    localStorage.setItem('merka_following', JSON.stringify(['local_pk']));
    vi.mocked(fetchFollowList).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHook());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.followedPks.has('local_pk')).toBe(true);
  });

  it('does nothing when keys is null', async () => {
    const { result } = renderHook(() => {
      const isNewAccountRef = useRef(false);
      return useFollowsAndLikes(null, isNewAccountRef);
    });
    await act(async () => { await result.current.handleLike(makeEvent('ev1')); });
    await act(async () => { await result.current.handleFollow('pk1'); });
    expect(publishReaction).not.toHaveBeenCalled();
    expect(publishFollowList).not.toHaveBeenCalled();
  });
});
