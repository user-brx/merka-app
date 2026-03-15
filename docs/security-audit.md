# Security Audit — Merka App

**Date:** 2026-03-14
**Stack:** React 19 + TypeScript + Vite 7 + nostr-tools v2.x
**Scope:** Client-side only (no backend). Protocol: Nostr NIPs 01, 02, 04, 07, 17, 19, 25, 44, 50, 57, 65.

---

## Summary

| Area | Status | Severity |
|---|---|---|
| Private key handling (sk/nsec) | ✅ Secure | — |
| NIP-49 key encryption | ✅ Implemented | — |
| DMs — NIP-17 + NIP-44 | ✅ Correct implementation | — |
| Session & logout | ✅ OK (with note) | LOW |
| XSS / content rendering | ✅ Safe (React escaping) | — |
| Link sanitization | ✅ `safeUrl()` blocks `javascript:` / `data:` | — |
| CSP header | ✅ Configured | LOW |
| Nostr event signature verification | ⚠️ Missing at runtime | MEDIUM |
| Zap: LNURL callback domain validation | ⚠️ Missing | MEDIUM |
| Relay URLs validation on save | ⚠️ Partial | LOW |
| `subscribeToFollowingNotes` authors filter | ⚠️ Bug (not security) | INFO |
| localStorage residue after logout | ⚠️ Social metadata retained | LOW |

---

## 1. ✅ Private Key — SECURE

**Files:** `src/services/nostr/auth.ts`, `src/hooks/useNostrAuth.ts`

- `generateSecretKey()` from nostr-tools generates a cryptographically secure key.
- `sk` is stored as `Uint8Array` in React state — not serializable to JSON, never hits localStorage directly.
- NIP-49 (`nip49.encrypt / nip49.decrypt`) is offered on every login flow.
- When NIP-49 is used, `merka_nsec` stores `ncryptsec1...` (encrypted). Without it, plain `nsec1...` is stored.
- **No `console.log`, `console.debug` or props that expose `sk` or `nsec`** were found anywhere in source.

**Note:** NIP-49 protection is optional. A user who skips it stores plain nsec in localStorage.
**Recommendation:** Add a gentle warning or badge when the key is stored without protection.

---

## 2. ✅ DMs (NIP-17 + NIP-44) — SECURE

**File:** `src/services/nostr/messaging.ts`

Full Gift Wrap stack implemented correctly:
- Kind 14 Rumor → Kind 13 Seal (`nip44.encrypt`) → Kind 1059 Gift Wrap (ephemeral key).
- `randomPast()` applies ±2-day timestamp jitter on Seal and Wrap, mitigating timing correlation.
- `createSelfCopyWrap` creates a separate copy addressed to the sender's own pubkey, enabling sent-message history without relay exposure.
- NIP-04 (AES-CBC legacy) is **not used anywhere** — migration complete.
- Relay operators **cannot determine** sender, recipient, or content of Kind 1059 events.

---

## 3. ✅ XSS / Content Rendering — SAFE

**Files:** `src/pages/Feed/Feed.tsx` (line 243), `src/components/feed/NoteCard.tsx`

- `renderNoteContent` returns either a plain string or `<span>{data.msg}</span>`. React auto-escapes all string content — no raw HTML injection.
- **No `dangerouslySetInnerHTML` found** anywhere in the codebase.
- `safeUrl()` in NoteCard.tsx (line 17) enforces `^https?:\/\/` — blocks `javascript:`, `data:`, `blob:` and relative URLs.
- External links use `target="_blank" rel="noopener noreferrer"` — prevents tab-napping.

---

## 4. ✅ CSP Header — CONFIGURED

**File:** `index.html`

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' wss: https:;
img-src * data: blob:;
font-src 'self';
object-src 'none';
base-uri 'self';
```

- `script-src 'self'` — no inline scripts or eval allowed. Solid.
- `object-src 'none'` — blocks Flash/plugin injection.
- `base-uri 'self'` — prevents base tag hijacking.

**Notes:**
- `connect-src wss: https:` is intentionally broad — required for connecting to arbitrary Nostr relays.
- `img-src *` allows images from any origin (needed for user avatars). Images loaded via `<img>` can be used as tracking pixels by third parties. Referrer policy on `<img>` tags should be `no-referrer`.
- `unsafe-inline` in `style-src` is accepted — React uses inline styles extensively.

---

## 5. ⚠️ Event Signature Verification — MISSING AT RUNTIME

**Files:** `src/services/nostr/nostr.ts` (all `subscribeMany` callbacks), `src/services/nostr/messaging.ts`

`verifyEvent()` from nostr-tools is used **only in test files** (`nostr.test.ts`, `nostr-extended.test.ts`). It is **not called** on events received from relays at runtime.

**Risk:** A malicious relay can forge events with arbitrary `pubkey` values. Without signature verification, the app would display these events as legitimate. For feed notes this is an aesthetic/spam risk. For DMs, `nip17.unwrapEvent` would fail to decrypt forged wraps (the crypto layer rejects them), so **DMs are implicitly protected** by the decryption step.

**Recommendation:** Add `verifyEvent(ev)` check before processing in `onevent` callbacks:

```ts
// In subscribeMany onevent handlers:
import { verifyEvent } from 'nostr-tools';

onevent(ev: NostrEvent) {
  if (!verifyEvent(ev)) return; // drop forged events
  // ... existing logic
}
```

Priority: `subscribeToNotes`, `subscribeToReactions`, `subscribeToReplies`.

---

## 6. ⚠️ Zap: LNURL Callback Domain Not Validated

**File:** `src/services/nostr/zap.ts` (lines 79–101)

`fetchZapInvoice(callback, ...)` uses the `callback` URL returned by the LNURL server without verifying it belongs to the same domain as the original endpoint.

**Risk:** A malicious LNURL server could return a `callback` URL pointing to a third-party domain. The `nostr` (zap request JSON) and `amount` parameters would then be sent to that domain, potentially leaking the user's Nostr identity and payment intent.

**Recommendation:** Validate that `callback` origin matches `endpoint` origin before calling:

```ts
const endpointOrigin = new URL(endpoint).origin;
const callbackOrigin = new URL(meta.callback).origin;
if (endpointOrigin !== callbackOrigin) throw new Error('LNURL callback domain mismatch');
```

---

## 7. ⚠️ Relay URLs Not Validated on Manual Save

**File:** `src/services/nostr/relayHealth.ts` (line 154 `updateRelays`)

`fetchNip65Relays` (line 196) correctly rejects non-`wss://` URLs. However, `updateRelays` called from `RelaySettingsModal` does not validate that URLs start with `wss://`. A user could manually add a `ws://` (plaintext) relay URL.

**Risk:** Low — only affects the user's own configuration. But a `ws://` relay would send and receive events in plaintext, exposing subscriptions and published events to network observers.

**Recommendation:** Add validation in `updateRelays`:

```ts
export function updateRelays(newConfigs: RelayConfig[]) {
  const safe = newConfigs.filter(c => c.url.startsWith('wss://'));
  // use safe instead of newConfigs
}
```

---

## 8. ⚠️ Logout Does Not Clear Social Metadata

**File:** `src/hooks/useNostrAuth.ts` (line 98), `src/App.tsx`

`logout()` removes `merka_nsec`, `merka_nsec_ts`, `merka_search_query`, `merka_search_type`.
It does **not** remove: `merka_liked`, `merka_following`, `merka_contacts`, `merka_unread`, `merka_read_ts`, `merka_relays`.

**Risk:** LOW. If a device is shared or compromised after logout, an attacker can read the follow list, liked note IDs, DM contact list, and unread message timestamps from localStorage — without accessing the private key.

**Recommendation:** Clear all `merka_*` keys on logout, or document the intentional retention.

---

## 9. INFO — `subscribeToFollowingNotes` Ignores `pubkeys` Parameter

**File:** `src/services/nostr/nostr.ts` (lines 93–98)

The function receives `pubkeys: string[]` but the Nostr filter does not include `authors: pubkeys`. This is a **functional bug** (following tab shows global notes, not filtered by followed accounts), not a security issue.

---

## 10. INFO — `img-src *` and Avatar Tracking

**CSP + NoteCard.tsx**

User avatars are loaded from profile metadata without `referrerpolicy="no-referrer"`. Combined with `img-src *` in CSP, any image host can receive a referrer header showing the app's origin when loading avatars.

**Recommendation:** Add `referrerPolicy="no-referrer"` to all `<img>` tags that load external URLs (avatar images).

---

## Risk Matrix

| # | Finding | Exploitability | Impact | Priority |
|---|---|---|---|---|
| 5 | No `verifyEvent` at runtime | Medium (needs malicious relay) | Feed spam / fake notes | **HIGH** |
| 6 | LNURL callback domain not validated | Medium (needs malicious LN server) | Identity + amount leak | **HIGH** |
| 7 | `ws://` relays accepted | Low (user-initiated) | Traffic interception | MEDIUM |
| 8 | Social metadata not cleared on logout | Low (needs device access) | Privacy leak | LOW |
| 10 | Avatar referrer leakage | Low | Origin tracking | LOW |
| 1* | Plain nsec stored without NIP-49 | Low (user choice) | Key theft via XSS/ext | LOW |

---

## Quick Wins (low effort, high value)

1. Add `if (!verifyEvent(ev)) return;` in all `onevent` runtime callbacks.
2. Validate `callback` origin === `endpoint` origin in `fetchZapInvoice`.
3. Add `referrerPolicy="no-referrer"` to avatar `<img>` tags.
4. Clear all `merka_*` localStorage keys on logout.
5. Validate `wss://` prefix in `updateRelays`.
