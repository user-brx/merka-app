import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompose } from './useCompose';
import { MERKA_PUBKEY } from '../../../config/constants';
import type { Translations } from '../../../i18n/translations';

vi.mock('../../../services/nostr/nostr', () => ({
  publishNote: vi.fn().mockResolvedValue(true),
  publishFollowList: vi.fn().mockResolvedValue(undefined),
}));

import { publishNote, publishFollowList } from '../../../services/nostr/nostr';

const KEYS = { sk: new Uint8Array(32), pk: 'mypk', nsec: 'nsec1', npub: 'npub1' };
const T = { publishNote: 'Publicado!', publishFail: 'Falhou' } as unknown as Translations;
const TOAST = vi.fn();

function makeHook(followedPks = new Set<string>()) {
  const setFollowedPks = vi.fn();
  return renderHook(() =>
    useCompose(KEYS, 'pt', T, followedPks, setFollowedPks, TOAST)
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useCompose', () => {
  it('initializes with empty post and default postType=sell', () => {
    const { result } = makeHook();
    expect(result.current.newPost).toBe('');
    expect(result.current.postType).toBe('sell');
  });

  it('restores postType from localStorage', () => {
    localStorage.setItem('merka_post_type', 'buy');
    const { result } = makeHook();
    expect(result.current.postType).toBe('buy');
  });

  it('restores postTag from localStorage', () => {
    localStorage.setItem('merka_post_tag', 'electronics');
    const { result } = makeHook();
    expect(result.current.postTag).toBe('electronics');
  });

  it('persists postType and postTag to localStorage on change', () => {
    const { result } = makeHook();
    act(() => result.current.setPostType('buy'));
    expect(localStorage.getItem('merka_post_type')).toBe('buy');
    act(() => result.current.setPostTag('cars'));
    expect(localStorage.getItem('merka_post_tag')).toBe('cars');
  });

  it('handlePost calls publishNote and resets state on success', async () => {
    const { result } = makeHook();
    act(() => result.current.setNewPost('Item for sale'));

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => { await result.current.handlePost(fakeEvent); });

    expect(publishNote).toHaveBeenCalledOnce();
    expect(result.current.newPost).toBe('');
    expect(result.current.composeOpen).toBe(false);
    expect(TOAST).toHaveBeenCalledWith('Publicado!');
  });

  it('handlePost does nothing if post is empty or whitespace', async () => {
    const { result } = makeHook();
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => { await result.current.handlePost(fakeEvent); });
    expect(publishNote).not.toHaveBeenCalled();
  });

  it('handlePost does not call publishNote when it fails', async () => {
    vi.mocked(publishNote).mockResolvedValueOnce(false);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = makeHook();
    act(() => result.current.setNewPost('test post'));
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => { await result.current.handlePost(fakeEvent); });
    expect(alertSpy).toHaveBeenCalledWith(T.publishFail);
    expect(result.current.newPost).toBe('test post'); // not cleared on fail
    alertSpy.mockRestore();
  });

  it('auto-follows MERKA_PUBKEY on first post if not already following', async () => {
    const setFollowedPks = vi.fn();
    const { result } = renderHook(() =>
      useCompose(KEYS, 'pt', T, new Set(), setFollowedPks, TOAST)
    );
    act(() => result.current.setNewPost('My first post'));
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => { await result.current.handlePost(fakeEvent); });
    expect(setFollowedPks).toHaveBeenCalledWith(expect.any(Set));
    const calledWith: Set<string> = setFollowedPks.mock.calls[0][0];
    expect(calledWith.has(MERKA_PUBKEY)).toBe(true);
    expect(publishFollowList).toHaveBeenCalled();
  });

  it('does not auto-follow MERKA_PUBKEY if already following', async () => {
    const { result } = makeHook(new Set([MERKA_PUBKEY]));
    act(() => result.current.setNewPost('Another post'));
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => { await result.current.handlePost(fakeEvent); });
    expect(publishFollowList).not.toHaveBeenCalled();
  });

  it('composeOpen toggling works', () => {
    const { result } = makeHook();
    expect(result.current.composeOpen).toBe(false);
    act(() => result.current.setComposeOpen(true));
    expect(result.current.composeOpen).toBe(true);
  });
});
