import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import type { Translations, LangCode } from '../../i18n/translations';
import { NoteCard, type NostrEvent } from '../../components/feed/NoteCard';
import {
  subscribeToNotes,
  subscribeToUserNotes,
  subscribeToFollowingNotes,
  searchNostrNotes,
  publishNote,
  publishFollowList,
  fetchNotesBatch
} from '../../services/nostr/nostr';
import { APP_GUID, MERKA_PUBKEY } from '../../config/constants';
import { CopyIcon, SearchIcon } from '../../components/ui/icons';

export interface FeedProps {
  t: Translations;
  lang: LangCode;
  keys: { sk: Uint8Array; pk: string; nsec: string; npub: string };
  friendlyName?: string;
  followedPks: Set<string>;
  setFollowedPks: (pks: Set<string>) => void;
  likedIds: Set<string>;
  showGlobalToast: (msg: string) => void;
  onLike: (note: NostrEvent) => Promise<void>;
  onFollow: (pubkey: string) => Promise<void>;
  onUnfollow: (pubkey: string) => Promise<void>;
  onOpenChat: (pubkey: string, npub: string) => void;
  onOpenZap: (pubkey: string, npub: string, noteId?: string, lud16?: string) => void;
}

export function Feed({
  t, lang, keys, friendlyName, followedPks, setFollowedPks, likedIds,
  showGlobalToast, onLike, onFollow, onUnfollow, onOpenChat, onOpenZap
}: FeedProps) {
  const [globalNotes, setGlobalNotes] = useState<NostrEvent[]>([]);
  const [userNotes, setUserNotes] = useState<NostrEvent[]>([]);
  const [followingNotes, setFollowingNotes] = useState<NostrEvent[]>([]);

  // Search
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [searchResults, setSearchResults] = useState<NostrEvent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem('merka_search_tag', searchFilterTag);
  }, [searchFilterTag]);
  useEffect(() => {
    localStorage.setItem('merka_search_query', searchQuery);
    localStorage.setItem('merka_search_type', searchFilterType);
    localStorage.setItem('merka_search_lang', searchFilterLang);
  }, [searchQuery, searchFilterType, searchFilterLang]);

  const [collapsePostForm, setCollapsePostForm] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'buy' | 'sell'>(() => {
    const saved = localStorage.getItem('merka_post_type');
    return (saved === 'buy' || saved === 'sell') ? saved : 'sell';
  });
  const [postTag, setPostTag] = useState(() => localStorage.getItem('merka_post_tag') || '');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    localStorage.setItem('merka_post_type', postType);
    localStorage.setItem('merka_post_tag', postTag);
  }, [postType, postTag]);

  const [activeTab, setActiveTab] = useState<'merka' | 'following' | 'mine'>('merka');

  // Pagination
  const [merkaWindowStart, setMerkaWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [followingWindowStart, setFollowingWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [mineWindowStart, setMineWindowStart] = useState(() => Math.floor(Date.now() / 1000) - 86400);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMerkaTag = (n: NostrEvent) => n.tags.some(tag => tag[0] === 't' && tag[1] === APP_GUID);

  // Global / Merka feed
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

  // My posts
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

  // Following feed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowingNotes([]); 
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

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPublishing(true);

    if (!followedPks.has(MERKA_PUBKEY)) {
      const nextFollow = new Set(followedPks);
      nextFollow.add(MERKA_PUBKEY);
      setFollowedPks(nextFollow);
      localStorage.setItem('merka_following', JSON.stringify(Array.from(nextFollow)));
      publishFollowList(keys.sk, Array.from(nextFollow));
    }

    const eventTags = [
      ['t', APP_GUID],
      ['l', lang, 'ISO-639-1']
    ];

    const normalizedTag = postTag.trim().toLowerCase().slice(0, 10);
    if (normalizedTag) {
      eventTags.push(['t', normalizedTag]);
    }

    const payload = JSON.stringify({
      type: postType,
      msg: newPost.trim(),
      lang
    });

    const success = await publishNote(keys.sk, payload, eventTags);
    if (success) {
      setNewPost('');
      showGlobalToast("Publicado com sucesso!");
    } else {
      alert(t.publishFail);
    }
    setPublishing(false);
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
        if (tab === 'mine' && (ev.pubkey !== keys.pk)) return;
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
      }
    });
  };

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString();
  const truncateKey = (key: string) => key ? `${key.slice(0, 8)}...${key.slice(-6)}` : '';

  const extractMsg = (content: string): string => {
    try { return (JSON.parse(content) as { msg?: string }).msg ?? content; } catch { return content; }
  };

  const renderNoteContent = (content: string): React.ReactNode => {
    try {
      const data = JSON.parse(content);
      if (data?.msg) return <span>{data.msg}</span>;
    } catch { /* plain text */ }
    return content;
  };

  const extractNoteType = (content: string): 'buy' | 'sell' | null => {
    try {
      const data = JSON.parse(content);
      if (data?.type === 'buy' || data?.type === 'sell') return data.type;
    } catch { /* plain text */ }
    return null;
  };

  const isPostFiltered = (n: NostrEvent) => {
    if (searchFilterTag !== 'all') {
      const hasSecondaryTag = n.tags.some(tag => tag[0] === 't' && tag[1] === searchFilterTag);
      if (!hasSecondaryTag) return false;
    }
    if (searchFilterType === 'all' && searchFilterLang === 'all') return true;
    try {
      const d = JSON.parse(n.content);
      if (searchFilterType !== 'all' && d.type !== searchFilterType) return false;
      if (searchFilterLang === 'current' && d.lang !== lang) return false;
      return true;
    } catch {
      return false;
    }
  };

  const globalTags = useMemo(() => {
    const subset = new Set<string>();
    const allNotes = [...globalNotes, ...followingNotes, ...userNotes, ...searchResults];
    allNotes.forEach(n => {
      n.tags.forEach(tag => {
        if (tag[0] === 't' && tag[1] && tag[1] !== APP_GUID) {
          subset.add(tag[1].toLowerCase());
        }
      });
    });
    return Array.from(subset).sort();
  }, [globalNotes, followingNotes, userNotes, searchResults]);

  const filteredTagSuggestions = useMemo(() => {
    if (!tagInputValue) return globalTags;
    return globalTags.filter(t => t.includes(tagInputValue.toLowerCase()));
  }, [globalTags, tagInputValue]);

  const displayedGlobal = globalNotes.filter(n => hasMerkaTag(n) && isPostFiltered(n));
  const displayedFollowing = followingNotes.filter(n => hasMerkaTag(n) && followedPks.has(n.pubkey) && n.pubkey !== keys.pk && isPostFiltered(n));
  const displayedMine = userNotes.filter(n => hasMerkaTag(n) && n.pubkey === keys.pk && isPostFiltered(n));

  const noteCardShared = {
    t, myKeys: keys, likedIds, followedPks,
    onLike, onFollow, onUnfollow,
    onOpenChat,
    onOpenZap,
    formatTime, renderContent: renderNoteContent, extractNoteType,
  };

  return (
    <>
      <section className="glass-panel panel-collapsible" style={{ padding: collapsePostForm ? '.45rem 1.2rem' : '.8rem 1.2rem' }}>
        <div className="panel-collapse-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <span className="panel-collapse-label">{t.post}</span>
            {friendlyName && (
              <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friendlyName}</span>
            )}
            <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{truncateKey(keys.npub)}</span>
            <button
              type="button"
              aria-label={t.copied}
              onClick={() => navigator.clipboard.writeText(keys.npub).then(() => showGlobalToast(t.copied))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              <CopyIcon />
            </button>
          </div>
          <button
            type="button"
            className="panel-toggle-btn"
            aria-label="toggle post form"
            onClick={() => setCollapsePostForm(v => !v)}
          >
            <span className={`panel-toggle-chevron${collapsePostForm ? ' collapsed' : ''}`}>▲</span>
          </button>
        </div>
        {!collapsePostForm && <>
          <form className="post-form" onSubmit={handlePost} style={{ marginTop: '.4rem' }}>
            <textarea
              placeholder={t.whatsOnMind}
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              style={{ minHeight: '80px' }}
              disabled={publishing} />
            <div className="post-form-footer">
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                <div className="post-type-toggle">
                  <button
                    type="button"
                    className={`post-type-btn sell${postType === 'sell' ? ' active' : ''}`}
                    onClick={() => setPostType('sell')}
                  >
                    📦 {t.sell}
                  </button>
                  <button
                    type="button"
                    className={`post-type-btn buy${postType === 'buy' ? ' active' : ''}`}
                    onClick={() => setPostType('buy')}
                  >
                    🛒 {t.buy}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t.tagPlaceholder || 'Tag (opt)'}
                  value={postTag}
                  onChange={e => setPostTag(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{
                    padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-card)',
                    color: 'var(--text-main)', width: '90px'
                  }}
                />
                <button type="submit" disabled={publishing || !newPost.trim()} className="btn-small">
                  {publishing ? t.publishing : t.publishNote}
                </button>
              </div>
            </div>
          </form>
        </>}
      </section>

      <section className="glass-panel feed-panel">
        <div className="feed-tabs-row">
          <div className="feed-tabs">
            {(['merka', 'following', 'mine'] as const).map(tab => (
              <button key={tab}
                className={`feed-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
                title={tab === 'merka' ? t.hintMerka : tab === 'following' ? t.hintFollowing : t.hintMine}
              >
                {tab === 'merka' ? '🌍 Merka' : tab === 'following' ? '👥 ' + t.followingFeed : '👤 ' + t.myFeed}
              </button>
            ))}
          </div>
        </div>

        <div className="search-bar-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: '150px' }}>
            <span className="search-icon"><SearchIcon size={14} /></span>
            <input
              className="search-input"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchResults([]); setIsSearching(false); }}
              onKeyDown={e => e.key === 'Enter' && handleNostrSearch()}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={clearSearch} title="Clear">✕</button>
            )}
          </div>
          {searchQuery.trim() && (
            <button className="search-nostr-btn" onClick={handleNostrSearch} disabled={isSearching}>
              {isSearching ? '⏳' : '🌐'} {isSearching ? t.searchSearching : t.searchNostr}
            </button>
          )}
          <div ref={tagDropdownRef} style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
            <button
              className="tag-select"
              onClick={() => { setIsTagOpen(o => !o); setTagInputValue(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '90px', justifyContent: 'space-between' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {searchFilterTag === 'all' ? (t.allTags || 'All tags') : `#${searchFilterTag}`}
              </span>
              {searchFilterTag !== 'all'
                ? <span onClick={e => { e.stopPropagation(); setSearchFilterTag('all'); setIsTagOpen(false); }} style={{ opacity: 0.6, fontSize: '0.6rem', flexShrink: 0 }}>✕</span>
                : <span style={{ opacity: 0.4, fontSize: '0.5rem', flexShrink: 0 }}>▼</span>
              }
            </button>
            {isTagOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '3px', background: '#070d1a', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1100, display: 'flex', flexDirection: 'column', width: '130px', padding: '3px', boxShadow: '0 10px 24px rgba(0,0,0,0.85)', maxHeight: '180px', overflowY: 'auto' }}>
                <input
                  autoFocus
                  className="tag-dropdown-search"
                  placeholder="filter..."
                  value={tagInputValue}
                  onChange={e => setTagInputValue(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '5px', color: 'var(--text-main)', fontSize: '0.62rem', padding: '3px 6px', outline: 'none', marginBottom: '2px', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  className="lang-dropdown-item"
                  onClick={() => { setSearchFilterTag('all'); setIsTagOpen(false); }}
                  style={{ background: searchFilterTag === 'all' ? 'rgba(59,130,246,0.18)' : 'transparent', border: 'none', color: searchFilterTag === 'all' ? 'var(--primary)' : 'var(--text-muted)', padding: '3px 6px', textAlign: 'left', borderRadius: '4px', cursor: 'pointer', fontSize: '0.62rem', fontStyle: 'italic' }}
                >{t.allTags || 'All tags'}</button>
                {filteredTagSuggestions.map(tag => (
                  <button
                    key={tag}
                    className="lang-dropdown-item"
                    onClick={() => { setSearchFilterTag(tag); setIsTagOpen(false); setTagInputValue(''); }}
                    style={{ background: searchFilterTag === tag ? 'rgba(59,130,246,0.18)' : 'transparent', border: 'none', color: searchFilterTag === tag ? 'var(--primary)' : 'var(--text-main)', padding: '3px 6px', textAlign: 'left', borderRadius: '4px', cursor: 'pointer', fontSize: '0.62rem', display: 'flex', gap: '4px', alignItems: 'center' }}
                  ><span style={{ opacity: 0.4, fontSize: '0.55rem' }}>#</span>{tag}</button>
                ))}
                {filteredTagSuggestions.length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', padding: '4px 6px', fontStyle: 'italic' }}>no tags</span>
                )}
              </div>
            )}
            <button
              className="filter-chip"
              onClick={() => setSearchFilterType('all')}
              style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterType === 'all' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterType === 'all' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
            >{t.filterAll}</button>
            <button
              className="filter-chip"
              onClick={() => setSearchFilterType('buy')}
              style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterType === 'buy' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterType === 'buy' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
            >{t.buy}</button>
            <button
              className="filter-chip"
              onClick={() => setSearchFilterType('sell')}
              style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterType === 'sell' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterType === 'sell' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
            >{t.sell}</button>
            {activeTab !== 'mine' && (
              <button
                className="filter-chip"
                onClick={() => setSearchFilterLang(prev => prev === 'all' ? 'current' : 'all')}
                style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterLang === 'current' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterLang === 'current' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {searchFilterLang === 'all' ? t.langAll : <>{t.langCurrent}: {lang.toUpperCase()}</>}
              </button>
            )}</div>
        </div>

        <div className="feed-column">
          {searchQuery.trim() ? (
            (() => {
              const allLoaded = [...new Map([
                ...globalNotes, ...followingNotes, ...userNotes,
              ].map(n => [n.id, n])).values()];
              const q = searchQuery.toLowerCase();
              const clientFiltered = allLoaded.filter(n =>
                extractMsg(n.content).toLowerCase().includes(q)
              );
              let merged = [...new Map([
                ...searchResults, ...clientFiltered,
              ].map(n => [n.id, n])).values()]
                .sort((a, b) => b.created_at - a.created_at);

              if (activeTab === 'following') {
                merged = merged.filter(n => followedPks.has(n.pubkey) && n.pubkey !== keys.pk);
              } else if (activeTab === 'mine') {
                merged = merged.filter(n => n.pubkey === keys.pk);
              }

              merged = merged.filter(isPostFiltered);

              return <>
                <div className="search-results-header">
                  {isSearching
                    ? <span className="search-status-label">{t.searchSearching}</span>
                    : <span className="search-status-label">
                      <strong>{merged.length}</strong> {t.searchResults}
                    </span>
                  }
                </div>
                {merged.length === 0 && !isSearching
                  ? <p className="feed-empty">{t.searchEmpty}</p>
                  : merged.map(note => <NoteCard key={note.id} note={note} {...noteCardShared} />)
                }
              </>;
            })()
          ) : (
            <>
              {activeTab === 'merka' && (
                <>
                  {displayedGlobal.length === 0
                    ? <p className="feed-empty">{t.listening}</p>
                    : displayedGlobal.map(note => <NoteCard key={note.id} note={note} {...noteCardShared} />)
                  }
                  <button className="load-more-btn" onClick={() => loadMore24h('merka')} disabled={isLoadingMore}>
                    {isLoadingMore ? t.loading : t.loadMore24h}
                  </button>
                </>
              )}
              {activeTab === 'following' && (
                followedPks.size === 0
                  ? <p className="feed-empty">{t.noFollowing}</p>
                  : <>
                    {displayedFollowing.length === 0
                      ? <p className="feed-empty">{t.listening}</p>
                      : displayedFollowing.map(note => <NoteCard key={note.id} note={note} {...noteCardShared} />)
                    }
                    <button className="load-more-btn" onClick={() => loadMore24h('following')} disabled={isLoadingMore}>
                      {isLoadingMore ? t.loading : t.loadMore24h}
                    </button>
                  </>
              )}
              {activeTab === 'mine' && (
                <>
                  {displayedMine.length === 0
                    ? <p className="feed-empty">{t.listening}</p>
                    : displayedMine.map(note => <NoteCard key={note.id} note={note} {...noteCardShared} />)
                  }
                  <button className="load-more-btn" onClick={() => loadMore24h('mine')} disabled={isLoadingMore}>
                    {isLoadingMore ? t.loading : t.loadMore24h}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
