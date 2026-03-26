import { useState, useEffect, useRef, useMemo } from 'react';
import { type NostrEvent } from '../../../components/feed/NoteCard';
import { searchNostrNotes } from '../../../services/nostr/nostr';
import { APP_GUID } from '../../../config/constants';
import type { LangCode } from '../../../i18n/translations';

interface MerkaPayload { type?: string; msg?: string; lang?: string; }

export function parseMerkaContent(content: string): MerkaPayload | null {
  try { return JSON.parse(content); } catch { /* noop */ }
  const splitIdx = content.indexOf('\n\n---\n📦 Code:');
  if (splitIdx !== -1) {
    try { return JSON.parse(content.substring(0, splitIdx)); } catch { /* noop */ }
  }
  const lastBraceIdx = content.lastIndexOf('}');
  if (lastBraceIdx !== -1) {
    try { return JSON.parse(content.substring(0, lastBraceIdx + 1)); } catch { /* noop */ }
  }
  return null;
}

export function useSearch(
  lang: LangCode,
  hasMerkaTag: (n: NostrEvent) => boolean,
  globalNotes: NostrEvent[],
  userNotes: NostrEvent[],
  followingNotes: NostrEvent[],
) {
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('merka_search_query') || '');
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'buy' | 'sell'>(() => {
    const saved = localStorage.getItem('merka_search_type');
    return (saved === 'buy' || saved === 'sell') ? saved : 'all';
  });
  const [searchFilterLang, setSearchFilterLang] = useState<'all' | 'current'>(() => {
    const saved = localStorage.getItem('merka_search_lang');
    return saved === 'current' ? 'current' : 'all';
  });
  const [searchFilterTag, setSearchFilterTag] = useState(() => localStorage.getItem('merka_search_tag') || 'all');
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<NostrEvent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<(() => void) | null>(null);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTimeout(() => setIsTagOpen(false), 150);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('merka_search_tag', searchFilterTag);
  }, [searchFilterTag]);

  useEffect(() => {
    localStorage.setItem('merka_search_query', searchQuery);
    localStorage.setItem('merka_search_type', searchFilterType);
    localStorage.setItem('merka_search_lang', searchFilterLang);
  }, [searchQuery, searchFilterType, searchFilterLang]);

  const handleNostrSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (searchAbortRef.current) { searchAbortRef.current(); searchAbortRef.current = null; }
    setSearchResults([]);
    setIsSearching(true);
    const close = searchNostrNotes({
      query: q,
      onEvent: ev => {
        if (!hasMerkaTag(ev)) return;
        setSearchResults(prev => prev.some(n => n.id === ev.id) ? prev : [ev, ...prev]);
      },
      onDone: () => setIsSearching(false),
    });
    searchAbortRef.current = close;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchAbortRef.current) { searchAbortRef.current(); searchAbortRef.current = null; }
  };

  const isPostFiltered = (n: NostrEvent) => {
    if (searchFilterTag !== 'all') {
      if (!n.tags.some(tag => tag[0] === 't' && tag[1] === searchFilterTag)) return false;
    }
    if (searchFilterType === 'all' && searchFilterLang === 'all') return true;
    const d = parseMerkaContent(n.content);
    if (!d) return false;
    if (searchFilterType !== 'all' && d.type !== searchFilterType) return false;
    if (searchFilterLang === 'current' && d.lang !== lang) return false;
    return true;
  };

  const globalTags = useMemo(() => {
    const subset = new Set<string>();
    [...globalNotes, ...followingNotes, ...userNotes, ...searchResults].forEach(n => {
      n.tags.forEach(tag => {
        if (tag[0] === 't' && tag[1] && tag[1] !== APP_GUID) subset.add(tag[1].toLowerCase());
      });
    });
    return Array.from(subset).sort();
  }, [globalNotes, followingNotes, userNotes, searchResults]);

  const filteredTagSuggestions = useMemo(() => {
    if (!tagInputValue) return globalTags;
    return globalTags.filter(t => t.includes(tagInputValue.toLowerCase()));
  }, [globalTags, tagInputValue]);

  const extractMsg = (content: string): string => {
    const data = parseMerkaContent(content);
    if (data && typeof data.msg === 'string') return data.msg;
    return content;
  };

  return {
    searchQuery, setSearchQuery,
    searchFilterType, setSearchFilterType,
    searchFilterLang, setSearchFilterLang,
    searchFilterTag, setSearchFilterTag,
    isTagOpen, setIsTagOpen,
    tagInputValue, setTagInputValue,
    tagDropdownRef,
    searchResults, setSearchResults,
    isSearching, setIsSearching,
    filteredTagSuggestions,
    handleNostrSearch,
    clearSearch,
    isPostFiltered,
    extractMsg,
  };
}
