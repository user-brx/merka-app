import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDMManager } from './useDMManager';

vi.mock('../services/nostr/nostr', () => ({
  fetchDMPartners: vi.fn().mockResolvedValue([]),
  subscribeToIncomingDMs: vi.fn().mockReturnValue(() => {}),
  fetchProfile: vi.fn(),
}));

vi.mock('nostr-tools', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nostr-tools')>();
  return {
    ...actual,
    nip19: {
      ...actual.nip19,
      npubEncode: (pk: string) => `npub1_${pk.slice(0, 8)}`,
    },
  };
});

import { fetchDMPartners, subscribeToIncomingDMs } from '../services/nostr/nostr';

const KEYS = { sk: new Uint8Array(32), pk: 'aabbcc00', nsec: 'nsec1', npub: 'npub1test' };
const TOAST = vi.fn();
const NEW_MSG = 'Nova mensagem';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(subscribeToIncomingDMs).mockReturnValue(() => {});
  vi.mocked(fetchDMPartners).mockResolvedValue([]);
});

describe('useDMManager', () => {
  it('initializes with empty contacts and no chat target', () => {
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    expect(result.current.chatContacts).toHaveLength(0);
    expect(result.current.chatTarget).toBeNull();
  });

  it('restores valid contacts from localStorage on mount', () => {
    const contact = { pubkey: 'a'.repeat(64), npub: 'npub1valid', label: 'Alice' };
    localStorage.setItem('merka_contacts', JSON.stringify([contact]));
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    expect(result.current.chatContacts).toHaveLength(1);
    expect(result.current.chatContacts[0].label).toBe('Alice');
  });

  it('ignores malformed contacts in localStorage', () => {
    localStorage.setItem('merka_contacts', JSON.stringify([{ pubkey: 'bad', npub: 'nope', label: 'x' }]));
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    expect(result.current.chatContacts).toHaveLength(0);
  });

  it('addContact adds a new contact and persists to localStorage', () => {
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    act(() => result.current.addContact('b'.repeat(64), 'npub1bbb', 'Bob'));
    expect(result.current.chatContacts).toHaveLength(1);
    const stored = JSON.parse(localStorage.getItem('merka_contacts') || '[]');
    expect(stored[0].label).toBe('Bob');
  });

  it('addContact is idempotent — does not duplicate existing contact', () => {
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    act(() => result.current.addContact('b'.repeat(64), 'npub1bbb', 'Bob'));
    act(() => result.current.addContact('b'.repeat(64), 'npub1bbb', 'Bob Again'));
    expect(result.current.chatContacts).toHaveLength(1);
  });

  it('clearDMs resets all state and localStorage', () => {
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    act(() => result.current.addContact('b'.repeat(64), 'npub1bbb', 'Bob'));
    act(() => result.current.clearDMs());
    expect(result.current.chatContacts).toHaveLength(0);
    expect(result.current.chatTarget).toBeNull();
    expect(result.current.unreadPks.size).toBe(0);
    expect(localStorage.getItem('merka_contacts')).toBeNull();
    expect(localStorage.getItem('merka_unread')).toBeNull();
  });

  it('restores unread pks from localStorage', () => {
    localStorage.setItem('merka_unread', JSON.stringify(['pk_unread']));
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    expect(result.current.unreadPks.has('pk_unread')).toBe(true);
  });

  it('marks chat as read and clears unread when chatTarget is set', async () => {
    localStorage.setItem('merka_unread', JSON.stringify(['b'.repeat(64)]));
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    await act(async () => {
      result.current.setChatTarget({ pubkey: 'b'.repeat(64), npub: 'npub1bbb', label: 'Bob' });
    });
    expect(result.current.unreadPks.has('b'.repeat(64))).toBe(false);
  });

  it('fetchDMPartners results are merged as new contacts on login', async () => {
    vi.mocked(fetchDMPartners).mockResolvedValueOnce(['c'.repeat(64)]);
    const { result } = renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.chatContacts.some(c => c.pubkey === 'c'.repeat(64))).toBe(true);
  });

  it('subscribeToIncomingDMs is called on mount with keys', () => {
    renderHook(() => useDMManager(KEYS, TOAST, NEW_MSG));
    expect(subscribeToIncomingDMs).toHaveBeenCalled();
  });

  it('does not subscribe when keys is null', () => {
    renderHook(() => useDMManager(null, TOAST, NEW_MSG));
    expect(subscribeToIncomingDMs).not.toHaveBeenCalled();
  });
});
