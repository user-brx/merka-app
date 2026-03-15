import { SimplePool } from 'nostr-tools';

export const pool = new SimplePool();

export function now() {
  return Math.floor(Date.now() / 1000);
}
