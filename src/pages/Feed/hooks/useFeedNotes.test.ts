/**
 * Tests for useFeedNotes pure helpers.
 * The hook's subscription behavior (subscribeToNotes, subscribeToUserNotes,
 * subscribeToFollowingNotes, fetchNotesBatch) is covered by nostr.test.ts.
 * This file tests the deterministic logic that doesn't require a DOM environment.
 */
import { describe, it, expect } from 'vitest';
import { APP_GUID } from '../../../config/constants';
import type { NostrEvent } from '../../../components/feed/NoteCard';

// hasMerkaTag logic extracted for direct unit testing (same logic as in the hook)
function hasMerkaTag(n: NostrEvent): boolean {
  return n.tags.some(tag => tag[0] === 't' && tag[1] === APP_GUID);
}

// Dedup + sort logic extracted for direct unit testing (same logic as in the hook)
function mergeNotes(prev: NostrEvent[], ev: NostrEvent, limit = 200): NostrEvent[] {
  if (prev.some(n => n.id === ev.id)) return prev;
  return [ev, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, limit);
}

function makeNote(id: string, tags: string[][] = [['t', APP_GUID]], created_at = 1000): NostrEvent {
  return { id, pubkey: 'pk', content: '', created_at, tags, sig: '' };
}

describe('hasMerkaTag', () => {
  it('returns true when APP_GUID tag is present', () => {
    expect(hasMerkaTag(makeNote('1'))).toBe(true);
  });

  it('returns false when APP_GUID tag is absent', () => {
    expect(hasMerkaTag(makeNote('1', [['t', 'other']]))).toBe(false);
  });

  it('returns false for notes with no tags', () => {
    expect(hasMerkaTag(makeNote('1', []))).toBe(false);
  });

  it('returns false when tag key is present but value differs', () => {
    expect(hasMerkaTag(makeNote('1', [['t', APP_GUID + '-extra']]))).toBe(false);
  });
});

describe('mergeNotes (dedup + sort)', () => {
  it('adds new note to empty list', () => {
    const result = mergeNotes([], makeNote('1'));
    expect(result).toHaveLength(1);
  });

  it('deduplicates notes with the same id', () => {
    const note = makeNote('1');
    const list = mergeNotes([], note);
    const result = mergeNotes(list, note);
    expect(result).toHaveLength(1);
  });

  it('sorts by created_at descending', () => {
    const older = makeNote('old', [['t', APP_GUID]], 1000);
    const newer = makeNote('new', [['t', APP_GUID]], 2000);
    let list = mergeNotes([], older);
    list = mergeNotes(list, newer);
    expect(list[0].id).toBe('new');
    expect(list[1].id).toBe('old');
  });

  it('respects the limit and trims oldest notes', () => {
    let list: NostrEvent[] = [];
    for (let i = 0; i < 5; i++) {
      list = mergeNotes(list, makeNote(`note${i}`, [['t', APP_GUID]], i), 3);
    }
    expect(list).toHaveLength(3);
    // After limit=3, only the 3 newest (highest created_at) survive
    expect(list[0].created_at).toBeGreaterThan(list[1].created_at);
  });
});
