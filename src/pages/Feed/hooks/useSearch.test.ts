import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseMerkaContent, useSearch } from './useSearch';
import type { NostrEvent } from '../../../components/feed/NoteCard';
import { APP_GUID } from '../../../config/constants';

vi.mock('../../../services/nostr/nostr', () => ({
  searchNostrNotes: vi.fn(),
}));

import { searchNostrNotes } from '../../../services/nostr/nostr';

function makeNote(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'id1',
    pubkey: 'pk1',
    content: JSON.stringify({ type: 'sell', msg: 'selling stuff', lang: 'pt' }),
    created_at: 1000,
    kind: 1,
    tags: [['t', APP_GUID]],
    ...overrides,
  };
}

const hasMerkaTag = (n: NostrEvent) => n.tags.some(t => t[0] === 't' && t[1] === APP_GUID);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('parseMerkaContent', () => {
  it('parses clean JSON', () => {
    const result = parseMerkaContent('{"type":"sell","msg":"hello"}');
    expect(result?.type).toBe('sell');
    expect(result?.msg).toBe('hello');
  });

  it('parses JSON before footer separator', () => {
    const content = '{"type":"buy","msg":"item"}\n\n---\n📦 Code: https://github.com/x/y';
    expect(parseMerkaContent(content)?.type).toBe('buy');
  });

  it('parses JSON up to last closing brace', () => {
    const content = '{"type":"sell","msg":"test"} extra garbage';
    expect(parseMerkaContent(content)?.type).toBe('sell');
  });

  it('returns null for completely invalid content', () => {
    expect(parseMerkaContent('not json at all')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseMerkaContent('')).toBeNull();
  });
});

describe('useSearch', () => {
  it('initializes with empty query and default filters', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchFilterType).toBe('all');
    expect(result.current.searchFilterLang).toBe('all');
  });

  it('restores filters from localStorage', () => {
    localStorage.setItem('merka_search_query', 'bitcoin');
    localStorage.setItem('merka_search_type', 'buy');
    localStorage.setItem('merka_search_lang', 'current');
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    expect(result.current.searchQuery).toBe('bitcoin');
    expect(result.current.searchFilterType).toBe('buy');
    expect(result.current.searchFilterLang).toBe('current');
  });

  it('isPostFiltered returns true for matching note', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    const note = makeNote();
    expect(result.current.isPostFiltered(note)).toBe(true);
  });

  it('isPostFiltered filters by type', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    act(() => result.current.setSearchFilterType('buy'));
    const sellNote = makeNote(); // content has type: sell
    expect(result.current.isPostFiltered(sellNote)).toBe(false);
  });

  it('isPostFiltered filters by language', () => {
    const { result } = renderHook(() =>
      useSearch('en', hasMerkaTag, [], [], [])
    );
    act(() => result.current.setSearchFilterLang('current'));
    const ptNote = makeNote(); // content has lang: pt, but current lang is 'en'
    expect(result.current.isPostFiltered(ptNote)).toBe(false);
  });

  it('isPostFiltered filters by tag', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    act(() => result.current.setSearchFilterTag('electronics'));
    const noteWithoutTag = makeNote();
    expect(result.current.isPostFiltered(noteWithoutTag)).toBe(false);
    const noteWithTag = makeNote({ tags: [['t', APP_GUID], ['t', 'electronics']] });
    expect(result.current.isPostFiltered(noteWithTag)).toBe(true);
  });

  it('handleNostrSearch calls searchNostrNotes and populates results', () => {
    const mockNote = makeNote({ id: 'search1' });
    vi.mocked(searchNostrNotes).mockImplementation(({ onEvent, onDone }) => {
      onEvent(mockNote as never);
      onDone();
      return () => {};
    });

    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    act(() => result.current.setSearchQuery('bitcoin'));
    act(() => result.current.handleNostrSearch());

    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.searchResults[0].id).toBe('search1');
    expect(result.current.isSearching).toBe(false);
  });

  it('clearSearch resets results and query', () => {
    vi.mocked(searchNostrNotes).mockImplementation(({ onEvent, onDone }) => {
      onEvent(makeNote({ id: 'r1' }) as never);
      onDone();
      return () => {};
    });
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    act(() => result.current.setSearchQuery('thing'));
    act(() => result.current.handleNostrSearch());
    act(() => result.current.clearSearch());
    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('globalTags collects unique non-APP_GUID tags from all note lists', () => {
    const notes = [
      makeNote({ id: '1', tags: [['t', APP_GUID], ['t', 'bitcoin']] }),
      makeNote({ id: '2', tags: [['t', APP_GUID], ['t', 'gold']] }),
    ];
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, notes, [], [])
    );
    expect(result.current.filteredTagSuggestions).toContain('bitcoin');
    expect(result.current.filteredTagSuggestions).toContain('gold');
    expect(result.current.filteredTagSuggestions).not.toContain(APP_GUID);
  });

  it('extractMsg returns msg field from valid content', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    expect(result.current.extractMsg('{"type":"sell","msg":"Widget for sale"}')).toBe('Widget for sale');
  });

  it('extractMsg falls back to raw content for invalid JSON', () => {
    const { result } = renderHook(() =>
      useSearch('pt', hasMerkaTag, [], [], [])
    );
    expect(result.current.extractMsg('plain text')).toBe('plain text');
  });
});
