import { finalizeEvent } from 'nostr-tools';
import { pool, now } from './pool';

// ── Relay Configuration ───────────────────────────────────────────────────────
export interface RelayConfig {
  url: string;
  name: string;
}

export type RelayStatus = 'connecting' | 'connected' | 'error' | 'offline';

export interface RelayState {
  url: string;
  name: string;
  status: RelayStatus;
}

export const DEFAULT_RELAYS: RelayConfig[] = [
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://nostr.wine', name: 'Nostr.wine' },
  { url: 'wss://purplepag.es', name: 'Purplepages' },
  { url: 'wss://relay.snort.social', name: 'Snort' },
];

const saved = localStorage.getItem('merka_relays');
export let RELAY_CONFIGS: RelayConfig[] = saved ? JSON.parse(saved) : DEFAULT_RELAYS;

/** Flat URL list used by SimplePool */
export let RELAYS: string[] = RELAY_CONFIGS.map(r => r.url);

// ── Relay Health Monitor ─────────────────────────────────────────────────────
let _relayStates: RelayState[] = RELAY_CONFIGS.map(r => ({
  url: r.url, name: r.name, status: 'connecting',
}));

const _statusListeners = new Set<(states: RelayState[]) => void>();

let _isFetchingFallback = false;
let _lastFallbackTime = 0;

const TRUSTED_RELAY_DOMAINS = [
  'relay.damus.io', 'relay.primal.net', 'nos.lol', 'nostr.wine',
  'purplepag.es', 'relay.snort.social', 'relay.nostr.info',
  'nostr.fmt.wiz.biz', 'relay.current.fyi', 'purplepag.es',
  'relay.bitcoiner.social', 'nostr.oxtr.dev', 'relay.nostr.bg',
  'nostr-pub.wellorder.net', 'nostr.mom',
];

async function _triggerFallback() {
  const timeNow = Date.now();
  if (timeNow - _lastFallbackTime < 60000) return;
  _lastFallbackTime = timeNow;
  _isFetchingFallback = true;

  try {
    const res = await fetch('https://api.nostr.watch/v1/online');
    if (res.ok) {
      const onlineRelays: string[] = await res.json();
      if (onlineRelays && onlineRelays.length > 0) {
        const trusted = onlineRelays.filter(url =>
          TRUSTED_RELAY_DOMAINS.some(domain => url.includes(domain))
        );
        const shuffled = trusted.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);
        const newConfigs = [...RELAY_CONFIGS];
        let added = false;

        selected.forEach(url => {
          if (!newConfigs.some(c => c.url === url)) {
            newConfigs.push({ url, name: url.replace('wss://', '') });
            added = true;
          }
        });

        if (added) {
          updateRelays(newConfigs);
        }
      }
    }
  } catch (err) {
    console.error("HTTP fallback failed", err);
  }

  _isFetchingFallback = false;
}

function _notify() {
  const snapshot = _relayStates.map(s => ({ ...s }));
  _statusListeners.forEach(fn => fn(snapshot));

  if (!_isFetchingFallback && snapshot.length > 0 && snapshot.every(s => s.status === 'offline' || s.status === 'error')) {
    _triggerFallback();
  }
}

const _probeTimers = new Map<number, ReturnType<typeof setTimeout>>();

function _probe(index: number) {
  const cfg = RELAY_CONFIGS[index];
  if (!cfg || !_relayStates[index]) return;

  _relayStates[index].status = 'connecting';
  _notify();

  let settled = false;
  let ws: WebSocket;
  try { ws = new WebSocket(cfg.url); } catch {
    if (_relayStates[index]) _relayStates[index].status = 'error';
    _notify();
    _probeTimers.set(index, setTimeout(() => _probe(index), 60_000));
    return;
  }

  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    if (_relayStates[index]) _relayStates[index].status = 'offline';
    _notify();
    try { ws.close(); } catch { /* ignore */ }
    _probeTimers.set(index, setTimeout(() => _probe(index), 60_000));
  }, 6000);
  _probeTimers.set(index + 1000, timer);

  ws.onopen = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (_relayStates[index]) _relayStates[index].status = 'connected';
    _notify();
    try { ws.close(); } catch { /* ignore */ }
    _probeTimers.set(index, setTimeout(() => _probe(index), 120_000));
  };

  ws.onerror = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (_relayStates[index]) _relayStates[index].status = 'error';
    _notify();
    try { ws.close(); } catch { /* ignore */ }
    _probeTimers.set(index, setTimeout(() => _probe(index), 60_000));
  };
}

function _startProbers() {
  _probeTimers.forEach(t => clearTimeout(t));
  _probeTimers.clear();
  RELAY_CONFIGS.forEach((_, i) => _probeTimers.set(i + 2000, setTimeout(() => _probe(i), i * 300)));
}
_startProbers();

export function updateRelays(newConfigs: RelayConfig[]) {
  RELAY_CONFIGS = newConfigs;
  RELAYS = newConfigs.map(r => r.url);
  localStorage.setItem('merka_relays', JSON.stringify(newConfigs));

  _relayStates = newConfigs.map(r => ({
    url: r.url, name: r.name, status: 'connecting',
  }));

  _notify();
  _startProbers();
}

export function subscribeRelayStatus(cb: (states: RelayState[]) => void): () => void {
  _statusListeners.add(cb);
  cb(_relayStates.map(s => ({ ...s })));
  return () => _statusListeners.delete(cb);
}

export function getRelayStatuses(): RelayState[] {
  return _relayStates.map(s => ({ ...s }));
}

/** NIP-65: Publish kind:10002 Relay List Metadata */
export async function publishNip65Relays(sk: Uint8Array, configs: RelayConfig[]) {
  const event = finalizeEvent({
    kind: 10002, created_at: now(),
    tags: configs.map(c => ['r', c.url]),
    content: '',
  }, sk);
  try { await Promise.any(pool.publish(RELAYS, event)); return true; }
  catch { console.error("publishNip65Relays failed"); return false; }
}

/** NIP-65: Fetch kind:10002 Relay List Metadata */
export async function fetchNip65Relays(pubkey: string): Promise<RelayConfig[] | null> {
  try {
    const event = await pool.get(RELAYS, { kinds: [10002], authors: [pubkey] });
    if (!event) return null;

    const newConfigs: RelayConfig[] = [];
    for (const tag of event.tags) {
      if (tag[0] === 'r' && tag[1]) {
        const url = tag[1];
        if (!url.startsWith('wss://')) continue;
        const name = url.replace('wss://', '');
        if (!newConfigs.some(c => c.url === url)) {
          newConfigs.push({ url, name });
        }
      }
    }
    return newConfigs.length > 0 ? newConfigs : null;
  } catch {
    return null;
  }
}
