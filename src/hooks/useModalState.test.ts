import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalState } from './useModalState';

describe('useModalState', () => {
  it('initializes all modals as closed', () => {
    const { result } = renderHook(() => useModalState());
    const r = result.current;
    expect(r.showRelayPanel).toBe(false);
    expect(r.showRelaySettings).toBe(false);
    expect(r.showProfileModal).toBe(false);
    expect(r.showAboutNostr).toBe(false);
    expect(r.showAboutMerka).toBe(false);
    expect(r.showDonate).toBe(false);
    expect(r.showWalletGuide).toBe(false);
    expect(r.showKeyWarning).toBe(false);
    expect(r.showChatHistory).toBe(false);
    expect(r.showNetworkPanel).toBe(false);
    expect(r.zapTarget).toBeNull();
    expect(r.profilePopupTarget).toBeNull();
    expect(r.newAccountNsec).toBe('');
  });

  it('setters toggle individual modals independently', () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.setShowAboutNostr(true));
    expect(result.current.showAboutNostr).toBe(true);
    expect(result.current.showAboutMerka).toBe(false);
  });

  it('closeKeyWarning hides modal and clears nsec', () => {
    const { result } = renderHook(() => useModalState());
    act(() => {
      result.current.setShowKeyWarning(true);
      result.current.setNewAccountNsec('nsec1abc');
    });
    expect(result.current.showKeyWarning).toBe(true);
    act(() => result.current.closeKeyWarning());
    expect(result.current.showKeyWarning).toBe(false);
    expect(result.current.newAccountNsec).toBe('');
  });

  it('openAboutMerka shows aboutMerka modal', () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.openAboutMerka());
    expect(result.current.showAboutMerka).toBe(true);
  });

  it('openDonateFromAbout closes aboutMerka and opens donate', () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.setShowAboutMerka(true));
    act(() => result.current.openDonateFromAbout());
    expect(result.current.showAboutMerka).toBe(false);
    expect(result.current.showDonate).toBe(true);
  });

  it('resetModalsOnLogout closes chat, profile and zapTarget', () => {
    const { result } = renderHook(() => useModalState());
    act(() => {
      result.current.setShowChatHistory(true);
      result.current.setShowProfileModal(true);
      result.current.setZapTarget({ pubkey: 'abc', npub: 'npub1abc' });
    });
    act(() => result.current.resetModalsOnLogout());
    expect(result.current.showChatHistory).toBe(false);
    expect(result.current.showProfileModal).toBe(false);
    expect(result.current.zapTarget).toBeNull();
    // Unrelated modals are untouched
    expect(result.current.showAboutNostr).toBe(false);
  });

  it('setZapTarget and setProfilePopupTarget store objects', () => {
    const { result } = renderHook(() => useModalState());
    const zap = { pubkey: 'pk1', npub: 'npub1z', noteId: 'nid1', lud16: 'x@y.z' };
    const popup = { pubkey: 'pk2', npub: 'npub1p' };
    act(() => {
      result.current.setZapTarget(zap);
      result.current.setProfilePopupTarget(popup);
    });
    expect(result.current.zapTarget).toEqual(zap);
    expect(result.current.profilePopupTarget).toEqual(popup);
  });
});
