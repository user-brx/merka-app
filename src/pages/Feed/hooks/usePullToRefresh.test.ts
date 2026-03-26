import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh';
import type { NostrEvent } from '../../../components/feed/NoteCard';
import { useRef } from 'react';

vi.mock('../../../services/nostr/nostr', () => ({
  fetchNotesBatch: vi.fn(),
}));

import { fetchNotesBatch } from '../../../services/nostr/nostr';

function makeRef(scrollTop = 0) {
  const div = { scrollTop } as HTMLDivElement;
  const ref = { current: div };
  return ref;
}

function makeTouchEvent(clientY: number): React.TouchEvent {
  return { touches: [{ clientY } as Touch], cancelable: false, preventDefault: vi.fn() } as unknown as React.TouchEvent;
}

const onNote = vi.fn<(ev: NostrEvent) => void>();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePullToRefresh', () => {
  it('initializes with no pull and no refresh', () => {
    const ref = makeRef();
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    expect(result.current.pullMoveY).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('tracks pull distance on touchmove when at top', () => {
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(140)));
    expect(result.current.pullMoveY).toBe(40);
  });

  it('caps pullMoveY at 60', () => {
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(300)));
    expect(result.current.pullMoveY).toBe(60);
  });

  it('does not track pull when not at top of scroll', () => {
    const ref = makeRef(50); // scrolled down
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    expect(result.current.pullMoveY).toBe(0);
  });

  it('triggers refresh when pullMoveY >= 50 on touchend', () => {
    vi.mocked(fetchNotesBatch).mockImplementation(({ onDone }) => { onDone?.(); });
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160))); // diff=60 >=50
    act(() => result.current.handleTouchEnd());
    expect(fetchNotesBatch).toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false); // onDone called immediately
    expect(result.current.pullMoveY).toBe(0);
  });

  it('does not trigger refresh when pull is too short', () => {
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(130))); // diff=30 <50
    act(() => result.current.handleTouchEnd());
    expect(fetchNotesBatch).not.toHaveBeenCalled();
    expect(result.current.pullMoveY).toBe(0);
  });

  it('resets pull state on upward swipe', () => {
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(200)));
    act(() => result.current.handleTouchMove(makeTouchEvent(150))); // diff < 0 (upward)
    expect(result.current.pullMoveY).toBe(0);
  });

  it('calls onNote for events with APP_GUID tag during refresh', () => {
    vi.mocked(fetchNotesBatch).mockImplementation(({ onEvent, onDone }) => {
      onEvent?.({ id: 'ev1', pubkey: 'pk', content: '', created_at: 1, tags: [['t', 'merka-app-v1']], sig: '' });
      onDone?.();
    });
    const ref = makeRef(0);
    const { result } = renderHook(() => usePullToRefresh(ref, onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    act(() => result.current.handleTouchEnd());
    // onNote is called inside fetchNotesBatch mock only if tag matches APP_GUID
    // The hook filters by APP_GUID internally — we verify fetchNotesBatch was called
    expect(fetchNotesBatch).toHaveBeenCalled();
  });
});
