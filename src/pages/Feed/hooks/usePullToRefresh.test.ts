import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh';
import type { NostrEvent } from '../../../components/feed/NoteCard';

vi.mock('../../../services/nostr/nostr', () => ({
  fetchNotesBatch: vi.fn().mockReturnValue(() => {}),
}));

import { fetchNotesBatch } from '../../../services/nostr/nostr';

function makeRef(scrollTop = 0) {
  const div = { scrollTop } as HTMLDivElement;
  return { current: div };
}

function makeTouchEvent(clientY: number): React.TouchEvent {
  return { touches: [{ clientY } as Touch], cancelable: false, preventDefault: vi.fn() } as unknown as React.TouchEvent;
}

const onNote = vi.fn<(ev: NostrEvent) => void>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchNotesBatch).mockReturnValue(() => {});
});

describe('usePullToRefresh', () => {
  it('initializes with no pull and no refresh', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(), onNote));
    expect(result.current.pullMoveY).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('tracks pull distance on touchmove when at top', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(140)));
    expect(result.current.pullMoveY).toBe(40);
  });

  it('caps pullMoveY at 60', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(300)));
    expect(result.current.pullMoveY).toBe(60);
  });

  it('does not track pull when not at top of scroll', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(50), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    expect(result.current.pullMoveY).toBe(0);
  });

  it('triggers refresh when pullMoveY >= 50 on touchend', () => {
    vi.mocked(fetchNotesBatch).mockImplementation(({ onDone }) => { onDone?.(); return () => {}; });
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    act(() => result.current.handleTouchEnd());
    expect(fetchNotesBatch).toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullMoveY).toBe(0);
  });

  it('does not trigger refresh when pull is too short', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(130)));
    act(() => result.current.handleTouchEnd());
    expect(fetchNotesBatch).not.toHaveBeenCalled();
    expect(result.current.pullMoveY).toBe(0);
  });

  it('resets pull state on upward swipe', () => {
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(200)));
    act(() => result.current.handleTouchMove(makeTouchEvent(150)));
    expect(result.current.pullMoveY).toBe(0);
  });

  it('calls fetchNotesBatch during refresh (tag filtering done internally)', () => {
    vi.mocked(fetchNotesBatch).mockImplementation(({ onEvent, onDone }) => {
      onEvent?.({ id: 'ev1', pubkey: 'pk', content: '', created_at: 1, kind: 1, tags: [['t', 'merka-app-v1']] } as never);
      onDone?.();
      return () => {};
    });
    const { result } = renderHook(() => usePullToRefresh(makeRef(0), onNote));
    act(() => result.current.handleTouchStart(makeTouchEvent(100)));
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    act(() => result.current.handleTouchEnd());
    expect(fetchNotesBatch).toHaveBeenCalled();
  });
});
