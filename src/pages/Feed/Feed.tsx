import React, { useRef } from 'react';
import type { Translations, LangCode } from '../../i18n/translations';
import { NoteCard, type NostrEvent } from '../../components/feed/NoteCard';
import { SearchIcon, PlusIcon, XIcon, RefreshCwIcon, GlobeIcon } from '../../components/ui/icons';
import { useDragToClose } from '../../hooks/useDragToClose';
import { useFeedNotes } from './hooks/useFeedNotes';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useSearch, parseMerkaContent } from './hooks/useSearch';
import { useCompose } from './hooks/useCompose';

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
  t, lang, keys, followedPks, setFollowedPks, likedIds,
  showGlobalToast, onLike, onFollow, onUnfollow, onOpenChat, onOpenZap
}: FeedProps) {
  const feedColumnRef = useRef<HTMLDivElement>(null);

  const {
    globalNotes, userNotes, followingNotes,
    activeTab, setActiveTab,
    isLoadingMore, hasMerkaTag,
    addGlobalNote, loadMore24h,
  } = useFeedNotes(keys, followedPks);

  const {
    pullMoveY, isRefreshing,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = usePullToRefresh(feedColumnRef, addGlobalNote);

  const {
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
    handleNostrSearch, clearSearch,
    isPostFiltered, extractMsg,
  } = useSearch(lang, hasMerkaTag, globalNotes, userNotes, followingNotes);

  const {
    newPost, setNewPost,
    postType, setPostType,
    postTag, setPostTag,
    publishing, composeOpen, setComposeOpen,
    composeTextareaRef, handlePost,
  } = useCompose(keys, lang, t, followedPks, setFollowedPks, showGlobalToast);

  const composeDragProps = useDragToClose(() => setComposeOpen(false));

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderNoteContent = (content: string): React.ReactNode => {
    const data = parseMerkaContent(content);
    if (data && typeof data.msg === 'string') return <span>{data.msg}</span>;
    return content;
  };

  const extractNoteType = (content: string): 'buy' | 'sell' | null => {
    const data = parseMerkaContent(content);
    if (data?.type === 'buy' || data?.type === 'sell') return data.type as 'buy' | 'sell';
    return null;
  };

  const displayedGlobal = globalNotes.filter(n => hasMerkaTag(n) && isPostFiltered(n));
  const displayedFollowing = followingNotes.filter(n => hasMerkaTag(n) && followedPks.has(n.pubkey) && n.pubkey !== keys.pk && isPostFiltered(n));
  const displayedMine = userNotes.filter(n => hasMerkaTag(n) && n.pubkey === keys.pk && isPostFiltered(n));

  const noteCardShared = {
    t, myKeys: keys, likedIds, followedPks,
    onLike, onFollow, onUnfollow,
    onOpenChat, onOpenZap,
    formatTime, renderContent: renderNoteContent, extractNoteType,
  };

  return (
    <>
      <div className="feed-fab-wrapper">
        <section className="glass-panel feed-panel">
          <div className="feed-tabs-row">
            <div className="feed-tabs">
              {(['merka', 'following', 'mine'] as const).map(tab => (
                <button key={tab}
                  className={`feed-tab${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  title={tab === 'merka' ? t.hintMerka : tab === 'following' ? t.hintFollowing : t.hintMine}
                >
                  {tab === 'merka' ? <><GlobeIcon size={13} /> Merka</> : tab === 'following' ? '👥 ' + t.followingFeed : '👤 ' + t.myFeed}
                </button>
              ))}
            </div>
          </div>

          <div className="search-filters-group" style={{ position: 'relative', zIndex: 1100 }}>
            <div className="search-bar-row">
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
                  <button className="search-clear-btn" onClick={clearSearch} title={t.clearSearch}>✕</button>
                )}
              </div>
              {searchQuery.trim() && (
                <button className="search-nostr-btn" onClick={handleNostrSearch} disabled={isSearching}>
                  {isSearching ? '⏳' : '🌐'} {isSearching ? t.searchSearching : t.searchNostr}
                </button>
              )}
              <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div ref={tagDropdownRef} style={{ position: 'relative', zIndex: 1100 }}>
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
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '3px', background: '#070d1a', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1100, display: 'flex', flexDirection: 'column', width: '110px', padding: '3px', boxShadow: '0 10px 24px rgba(0,0,0,0.85)', maxHeight: '180px', overflowY: 'auto' }}>
                      <input
                        autoFocus
                        className="tag-dropdown-search"
                        placeholder={t.tagFilterPlaceholder}
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
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', padding: '4px 6px', fontStyle: 'italic' }}>{t.noTagsFound}</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="filter-chip"
                  onClick={() => setSearchFilterType(prev => prev === 'buy' ? 'all' : 'buy')}
                  style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterType === 'buy' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterType === 'buy' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
                >{t.buy}</button>
                <button
                  className="filter-chip"
                  onClick={() => setSearchFilterType(prev => prev === 'sell' ? 'all' : 'sell')}
                  style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterType === 'sell' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterType === 'sell' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
                >{t.sell}</button>
                <button
                  className="filter-chip"
                  onClick={() => setSearchFilterLang(prev => prev === 'all' ? 'current' : 'all')}
                  style={{ fontSize: '.72rem', padding: '.25rem .6rem', borderRadius: '14px', background: searchFilterLang === 'current' ? 'var(--primary)' : 'var(--bg-card)', color: searchFilterLang === 'current' ? '#fff' : 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {searchFilterLang === 'all' ? t.langAll : <>{t.langCurrent}: {lang.toUpperCase()}</>}
                </button>
              </div>
            </div>
          </div>

          {/* Pull-to-refresh indicator */}
          <div
            className="pull-refresh-bar"
            style={
              isRefreshing
                ? { height: '44px', opacity: 1 }
                : { height: `${Math.min(pullMoveY, 44)}px`, opacity: Math.min(pullMoveY / 40, 1) }
            }
            aria-hidden="true"
          >
            <div className={`pull-refresh-icon${isRefreshing ? ' spinning' : ''}`}>
              <RefreshCwIcon size={20} />
            </div>
          </div>

          <div
            className="feed-column"
            ref={feedColumnRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={
              pullMoveY > 0
                ? { transform: `translateY(${pullMoveY}px)`, transition: 'none' }
                : { transform: 'translateY(0)', transition: 'transform 0.3s ease' }
            }
          >
            {searchQuery.trim() ? (
              (() => {
                const allLoaded = [...new Map([
                  ...globalNotes, ...followingNotes, ...userNotes,
                ].map(n => [n.id, n])).values()];
                const q = searchQuery.toLowerCase();
                const clientFiltered = allLoaded.filter(n => extractMsg(n.content).toLowerCase().includes(q));
                let merged = [...new Map([
                  ...searchResults, ...clientFiltered,
                ].map(n => [n.id, n])).values()]
                  .sort((a, b) => b.created_at - a.created_at);

                if (activeTab === 'following') merged = merged.filter(n => followedPks.has(n.pubkey) && n.pubkey !== keys.pk);
                else if (activeTab === 'mine') merged = merged.filter(n => n.pubkey === keys.pk);
                merged = merged.filter(isPostFiltered);

                return <>
                  <div className="search-results-header">
                    {isSearching
                      ? <span className="search-status-label">{t.searchSearching}</span>
                      : <span className="search-status-label"><strong>{merged.length}</strong> {t.searchResults}</span>
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

        {/* Floating Action Button */}
        <button className="fab-compose" onClick={() => setComposeOpen(true)} aria-label={t.newPost}>
          <PlusIcon size={24} />
        </button>

        {/* Compose Drawer */}
        {composeOpen && (
          <div className="compose-drawer glass-panel" onClick={e => e.stopPropagation()} {...composeDragProps}>
            <div className="compose-drag-handle" />
            <div className="compose-drawer-header">
              <span className="compose-drawer-title">{t.newPost}</span>
              <button className="btn-icon" onClick={() => setComposeOpen(false)} aria-label={t.close}>
                <XIcon size={18} />
              </button>
            </div>
            <form className="post-form" onSubmit={handlePost}>
              <textarea
                ref={composeTextareaRef}
                placeholder={t.whatsOnMind}
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                style={{ height: '96px', resize: 'none', fontSize: '16px' }}
                disabled={publishing}
              />
              <div className="post-form-footer">
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="post-type-toggle">
                    <button type="button" className={`post-type-btn sell${postType === 'sell' ? ' active' : ''}`} onClick={() => setPostType('sell')} aria-label={t.sell}>
                      📦<span className="btn-label"> {t.sell}</span>
                    </button>
                    <button type="button" className={`post-type-btn buy${postType === 'buy' ? ' active' : ''}`} onClick={() => setPostType('buy')} aria-label={t.buy}>
                      🛒<span className="btn-label"> {t.buy}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="post-tag-input"
                    maxLength={10}
                    placeholder={t.tagPlaceholder || 'Tag (opt)'}
                    value={postTag}
                    onChange={e => setPostTag(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-card)', color: 'var(--text-main)', width: '90px' }}
                  />
                  <button type="submit" disabled={publishing || !newPost.trim()} className="btn-small">
                    {publishing ? t.publishing : t.publishNote}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Compose Overlay */}
      {composeOpen && <div className="compose-overlay" onClick={() => setComposeOpen(false)} />}
    </>
  );
}
