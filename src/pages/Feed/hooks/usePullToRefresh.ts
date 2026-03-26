import { useState, type RefObject } from 'react';
import { type NostrEvent } from '../../../components/feed/NoteCard';
import { fetchNotesBatch } from '../../../services/nostr/nostr';
import { APP_GUID } from '../../../config/constants';

export function usePullToRefresh(
  feedColumnRef: RefObject<HTMLDivElement | null>,
  onNote: (ev: NostrEvent) => void,
) {
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullMoveY, setPullMoveY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (feedColumnRef.current && feedColumnRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY !== null && feedColumnRef.current && feedColumnRef.current.scrollTop === 0) {
      const diff = e.touches[0].clientY - pullStartY;
      if (diff > 0) {
        setPullMoveY(Math.min(diff, 60));
        if (e.cancelable) e.preventDefault();
      } else {
        setPullStartY(null);
        setPullMoveY(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullMoveY >= 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullStartY(null);
      setPullMoveY(0); // spring back immediately; indicator stays via isRefreshing
      const since = Math.floor(Date.now() / 1000) - 86400;
      const until = Math.floor(Date.now() / 1000);
      fetchNotesBatch({
        since,
        until,
        onEvent: (ev: NostrEvent) => {
          if (!ev.tags.some(tag => tag[0] === 't' && tag[1] === APP_GUID)) return;
          onNote(ev);
        },
        onDone: () => setIsRefreshing(false),
      });
    } else {
      setPullStartY(null);
      setPullMoveY(0);
    }
  };

  return { pullMoveY, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd };
}
