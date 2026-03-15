import { finalizeEvent } from 'nostr-tools';
import type { NostrEvent, Filter } from 'nostr-tools';
import { APP_GUID } from '../../config/constants';
import { pool, now } from './pool';
import { RELAYS } from './relayHealth';

export * from './pool';
export * from './auth';
export * from './relayHealth';
export * from './messaging';
export * from './zap';

export async function publishNote(sk: Uint8Array, content: string, tags: string[][] = []) {
  const event = finalizeEvent({ kind: 1, created_at: now(), tags, content }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishNote failed"); return false; }
}

export async function publishProfile(sk: Uint8Array, profile: {
  name?: string; display_name?: string; about?: string;
  picture?: string; website?: string; nip05?: string; lud16?: string; bitcoin?: string;
}) {
  const event = finalizeEvent({
    kind: 0, created_at: now(), tags: [], content: JSON.stringify(profile),
  }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishProfile failed"); return false; }
}

export async function publishReply(
  sk: Uint8Array, content: string,
  replyToId: string, replyToPubkey: string,
  tags: string[][] = []
) {
  const event = finalizeEvent({
    kind: 1, created_at: now(),
    tags: [['e', replyToId, '', 'reply'], ['p', replyToPubkey], ...tags],
    content,
  }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishReply failed"); return false; }
}

export async function publishReaction(
  sk: Uint8Array, noteId: string, notePubkey: string, reaction = '+'
) {
  const event = finalizeEvent({
    kind: 7, created_at: now(),
    tags: [['e', noteId], ['p', notePubkey]],
    content: reaction,
  }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishReaction failed"); return false; }
}

export async function publishFollowList(sk: Uint8Array, followedPubkeys: string[]) {
  const event = finalizeEvent({
    kind: 3, created_at: now(),
    tags: followedPubkeys.map(pk => ['p', pk]),
    content: '',
  }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishFollowList failed"); return false; }
}

export function fetchProfile(pubkey: string, onProfile: (profile: Record<string, string>) => void) {
  const sub = pool.subscribeMany(
    RELAYS,
    { kinds: [0], authors: [pubkey], limit: 1 },
    {
      onevent(event: NostrEvent) {
        try { onProfile(JSON.parse(event.content)); } catch { /* ignore */ }
      }
    }
  );
  setTimeout(() => sub.close(), 5000);
}

export function subscribeToNotes(onEvent: (event: NostrEvent) => void, since?: number) {
  const filter: Filter = { kinds: [1], '#t': [APP_GUID], limit: 50 };
  if (since) filter.since = since;
  const sub = pool.subscribeMany(RELAYS, filter, { onevent: onEvent });
  return () => sub.close();
}

export function subscribeToUserNotes(pubkey: string, onEvent: (event: NostrEvent) => void, since?: number) {
  const filter: Filter = { kinds: [1], authors: [pubkey], limit: 50 };
  if (since) filter.since = since;
  const sub = pool.subscribeMany(RELAYS, filter, { onevent: onEvent });
  return () => sub.close();
}

export function subscribeToFollowingNotes(pubkeys: string[], onEvent: (event: NostrEvent) => void, since?: number) {
  if (!pubkeys.length) return () => { };
  const filter: Filter = { kinds: [1], '#t': [APP_GUID], limit: 50 };
  if (since) filter.since = since;
  const sub = pool.subscribeMany(RELAYS, filter, { onevent: onEvent });
  return () => sub.close();
}

export function fetchNotesBatch(options: {
  since: number;
  until: number;
  authors?: string[];
  onEvent: (event: NostrEvent) => void;
  onDone: () => void;
}) {
  const filter: Filter = {
    kinds: [1],
    limit: 50,
    since: options.since,
    until: options.until,
    '#t': [APP_GUID],
  };

  if (options.authors && options.authors.length > 0) {
    filter.authors = options.authors;
  }

  const sub = pool.subscribeMany(RELAYS, filter, {
    onevent: options.onEvent,
    oneose: () => { options.onDone(); sub.close(); }
  });
  return () => sub.close();
}

export async function fetchFollowList(myPubkey: string): Promise<string[] | null> {
  return new Promise<string[] | null>((resolve) => {
    let latestEvent: NostrEvent | null = null;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      sub.close();
      if (!latestEvent) { resolve(null); return; }
      const pks: string[] = (latestEvent.tags ?? [])
        .filter((t: string[]) => t[0] === 'p' && t[1])
        .map((t: string[]) => t[1]);
      resolve(pks);
    };
    const sub = pool.subscribeMany(
      RELAYS,
      { kinds: [3], authors: [myPubkey], limit: 5 },
      {
        onevent(ev: NostrEvent) {
          if (!latestEvent || ev.created_at > latestEvent.created_at) latestEvent = ev;
        },
        oneose: done
      }
    );
    setTimeout(done, 6000);
  });
}

export async function fetchFollowers(targetPubkey: string): Promise<string[]> {
  return new Promise<string[]>((resolve) => {
    const followers = new Set<string>();
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      sub.close();
      resolve(Array.from(followers));
    };

    const sub = pool.subscribeMany(
      RELAYS,
      { kinds: [3], '#p': [targetPubkey], limit: 500 },
      {
        onevent(ev: NostrEvent) {
          followers.add(ev.pubkey);
        },
        oneose: finish
      }
    );

    setTimeout(finish, 8000);
  });
}

export function subscribeToReplies(noteId: string, onEvent: (event: NostrEvent) => void) {
  const sub = pool.subscribeMany(
    RELAYS,
    { kinds: [1], '#e': [noteId], limit: 10 },
    { onevent: onEvent }
  );
  return () => sub.close();
}

export function subscribeToReactions(noteId: string, onEvent: (event: NostrEvent) => void) {
  const sub = pool.subscribeMany(
    RELAYS,
    { kinds: [7], '#e': [noteId], limit: 50 },
    { onevent: onEvent }
  );
  return () => sub.close();
}

const SEARCH_RELAYS = [
  'wss://relay.nostr.band',
  'wss://nostr.wine',
];

export function searchNostrNotes(options: {
  query: string;
  onEvent: (event: NostrEvent) => void;
  onDone: () => void;
}): () => void {
  if (!options.query.trim()) { options.onDone(); return () => { }; }

  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    options.onDone();
    try { sub.close(); } catch { /* ignore */ }
  };

  const sub = pool.subscribeMany(
    SEARCH_RELAYS,
    { kinds: [1], '#t': [APP_GUID], search: options.query.trim(), limit: 30 },
    { onevent: options.onEvent, oneose: finish }
  );

  setTimeout(finish, 8000);
  return () => finish();
}
