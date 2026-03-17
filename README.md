<div align="center">

# 🌍 Merka

**Decentralized open-source marketplace built on the Nostr protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE.md)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-orange.svg)](https://nostr.com)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](package.json)

</div>

---

## What is Merka?

Merka is a **free, open-source, censorship-resistant marketplace** built on the [Nostr](https://nostr.com) protocol. It allows anyone in the world to buy, sell, and trade goods and services without relying on any central server, company, or intermediary.

No accounts with companies. No phone numbers. No email addresses. Just your cryptographic identity — yours alone, forever.

> "Merka is the open market. Global by nature. Human by essence."

---

## What does Merka do?

| Feature | Description |
|---------|-------------|
| 📦 **Buy & Sell** | Post marketplace listings on the Nostr network tagged with `#Merka` |
| 🌍 **Global Feed** | Browse real-time listings from traders around the world |
| 👥 **Follow Network** | Build a personal network of trusted buyers and sellers |
| 🔍 **Search Users** | Find any user by `npub`, hex pubkey, name, NIP-05 address or bio text |
| 🔐 **Private Messaging** | End-to-end encrypted direct messages (NIP-17 + NIP-44) |
| 🔍 **Search** | Full-text search across the decentralized network (NIP-50) |
| 🌐 **15 Languages** | Fully localized: EN, PT, ES, IT, DE, HI, JA, ZH, AR, RU, FR, TR, FA, VI, UK |
| ⚡ **Lightning Zaps** | Generate BOLT11 invoices in-app, scan QR code, or pay via WebLN wallet extension — full NIP-57 flow |
| ₿ **Bitcoin On-chain** | Accept Bitcoin on-chain payments alongside Lightning — both in the same payment modal |
| 🌐 **Relay Management** | Add, remove and monitor relays in real time. NIP-65 relay lists published to Nostr |
| 📱 **PWA** | Installable progressive web app — works on any device, no app store needed |
| 🏷️ **Custom Tags** | Filter and categorize listings with custom hashtags |

---

## Technology Stack

Merka is built entirely on open standards and open-source libraries, with **no external UI framework** and **no backend**.

### Protocol Layer

| Technology | Role |
|------------|------|
| [Nostr Protocol](https://nostr.com) | Decentralized relay-based messaging |
| [nostr-tools v2.23](https://github.com/nbd-wtf/nostr-tools) | Nostr implementation library |
| Bitcoin / Lightning Network | Payments and value transfer |

### NIPs Implemented

| NIP | Description |
|-----|-------------|
| NIP-01 | Basic protocol — kind:0 profiles, kind:1 posts |
| NIP-02 | Follow lists (kind:3) |
| NIP-04 | Legacy encrypted DMs (kind:4) — maintained for compatibility |
| NIP-17 | Private direct messages with gift wrap (kind:1059) |
| NIP-19 | Bech32 entity encoding — `npub`, `nsec`, `note1` |
| NIP-25 | Reactions — kind:7 likes |
| NIP-44 | ChaCha20-Poly1305 authenticated encryption for DMs |
| NIP-49 | Password-protected private keys (`ncryptsec1` format) |
| NIP-50 | Full-text relay search |
| NIP-57 | Lightning Zaps — kind:9734 zap request, kind:9735 receipt, LNURL-pay, BOLT11 invoice generation |
| NIP-65 | User relay lists (kind:10002) — published on relay changes |

### Frontend

| Technology | Role |
|------------|------|
| React 19 + TypeScript | UI framework |
| Vite 7 | Build tool and dev server |
| Custom CSS | No UI framework — glass-panel/purple design system |
| `@fontsource/outfit` | Self-hosted fonts (no Google Fonts CDN) |
| `react-qr-code` | QR code generation for Zap and donation addresses |

### Testing

| Tool | Role |
|------|------|
| [Vitest 4](https://vitest.dev) | Test runner — fast, Vite-native |
| [@testing-library/react](https://testing-library.com) | Component testing — behavior-driven |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) | Realistic user interaction simulation |
| jsdom | Browser environment for tests |

**Coverage:** 351 tests across 11 test files covering all Nostr protocol functions, UI components, modals, hooks, i18n completeness (15 languages), and security boundaries.

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

### Relays (default)

Merka connects to 6 well-known public relays by default:
`relay.damus.io`, `relay.primal.net`, `nos.lol`, `nostr.wine`, `purplepag.es`, `relay.snort.social`

---

## How Merka Protects You

Security and privacy are first-class citizens in Merka. Here is what is built in:

### 🔑 Your Keys, Your Identity

Your Nostr private key (`nsec`) **never leaves your device**. Merka stores it locally using **NIP-49 encryption** — you can set a password so even if someone accesses your browser storage, they cannot use your key without it.

### 🔐 End-to-End Encrypted Messaging

All direct messages use **NIP-17 gift wrap** + **NIP-44 (ChaCha20-Poly1305)** — a modern authenticated encryption scheme that is significantly stronger than the deprecated NIP-04 (AES-CBC) used by older Nostr clients:

- **Authenticated**: messages cannot be tampered without detection
- **Gift wrap (NIP-17)**: hides sender, receiver, and real timestamp from relay operators
- **Strong primitives**: ChaCha20-Poly1305 via libsodium-compatible APIs

### 🛡️ Content Security Policy

A strict CSP header prevents:
- Loading scripts or styles from external sources
- Clickjacking and injection attacks
- Unauthorized WebSocket connections to untrusted hosts

### 🔗 Safe Link Validation

All external links are validated against an `https://` / `http://` allowlist before rendering. Dangerous protocols (`javascript:`, `data:`, `vbscript:`, etc.) are silently dropped.

### 📡 Trusted Relay Allowlist

When auto-discovering relays from the network, Merka only connects to a curated allowlist of known trusted relay domains — preventing relay injection attacks from malicious relay lists.

### 🖼️ No External Image Loading

Merka **does not load any external images** — including profile pictures from Nostr profiles. Profile pictures are replaced by a deterministic text avatar derived from the last 2 characters of the user's public key. This completely eliminates tracking pixel attacks, where a malicious user could discover the IP address of anyone who views their posts.

### 🚫 No Tracking, No Servers

Merka has **no backend**, **no analytics**, **no cookies**, and **no accounts**. Everything runs in your browser and communicates directly with Nostr relays via WebSocket. Your data belongs to you.

### Security Audit

A full security audit was performed covering:
- Private key exposure risks
- XSS and content injection
- Relay trust model
- Cryptographic correctness (NIP-44 vs NIP-04)
- Content Security Policy
- Unsafe URL protocols

All identified issues are resolved. See [`docs/security-audit.md`](docs/security-audit.md) for the full report.

---

## Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/merka.git
cd merka

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
# Open http://localhost:5173

# 4. Build for production
npm run build

# 5. Preview the production build
npm run preview
```

**Requirements:** Node.js 18+, npm 9+

---

## Project Structure

```
.
├── src/
│   ├── App.tsx                    # Root orchestrator — auth, modal routing, state
│   ├── config/
│   │   ├── constants.ts           # APP_GUID, MERKA_PUBKEY, donation addresses
│   │   └── constants.test.ts
│   ├── hooks/
│   │   ├── useNostrAuth.ts        # Login, logout, NIP-49 protection, 30-day session
│   │   └── useRelays.ts           # Real-time relay health monitoring
│   ├── services/nostr/
│   │   ├── nostr.ts               # Entry point — re-exports + publish functions
│   │   ├── pool.ts                # Shared SimplePool instance
│   │   ├── relayHealth.ts         # RELAYS list, health monitoring
│   │   ├── messaging.ts           # DMs: NIP-17/44 gift wrap
│   │   ├── auth.ts                # createKeys, loginWithKey, fetchProfile, follow lists
│   │   ├── zap.ts                 # NIP-57: LNURL-pay, zap request, BOLT11 invoice
│   │   ├── nostr.test.ts
│   │   └── nostr-extended.test.ts
│   ├── pages/
│   │   ├── Login/Login.tsx        # Key creation + login screen
│   │   └── Feed/
│   │       ├── Feed.tsx           # Main feed — subscribe, post, reactions
│   │       ├── ProfilePanel.tsx   # Edit profile (name, bio, lud16, BTC address, NIP-05)
│   │       ├── ChatHistoryPanel.tsx # DM history with unread badge
│   │       ├── KeyWarningModal.tsx  # Secure nsec display after key creation
│   │       ├── ZapModal.tsx         # ⚡ Lightning + ₿ Bitcoin payment modal (tabs, BOLT11, QR)
│   │       └── ZapModal.test.tsx
│   ├── components/
│   │   ├── feed/
│   │   │   ├── NoteCard.tsx       # Note card + AuthorProfile popup (copy npub)
│   │   │   └── NoteCard.test.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx      # Real-time encrypted DM panel
│   │   │   └── ChatPanel.test.tsx
│   │   ├── ui/icons.tsx           # All SVG icons inline
│   │   └── modals/
│   │       ├── about/             # AboutMerka, AboutNostr
│   │       ├── donate/            # DonateModal, WalletGuide
│   │       ├── network/
│   │       │   ├── NetworkListModal.tsx    # Followers/Following + search by npub/hex
│   │       │   ├── RelaySettingsModal.tsx  # Add/remove relays + confirm before delete
│   │       │   └── RelaySettingsModal.test.tsx
│   │       └── security/
│   │           ├── KeyProtectionModal.tsx  # NIP-49 password setup
│   │           ├── UnlockKeyModal.tsx      # NIP-49 decrypt on login
│   │           ├── KeyProtectionModal.test.tsx
│   │           └── UnlockKeyModal.test.tsx
│   ├── i18n/
│   │   ├── translations.ts        # 15 languages: EN PT ES IT DE HI JA ZH AR RU FR TR FA VI UK
│   │   └── translations.test.ts
│   └── styles/
│       └── index.css              # Full design system — glassmorphism, purple theme
├── public/
│   └── manifest.json              # PWA manifest
└── docs/
    ├── FEATURES.md                # Nostr roadmap & feature backlog
    └── security-audit.md          # Full security audit report
```

---

## Contributing

Merka is open source and contributions are welcome.

1. **Report bugs** — open an issue describing steps to reproduce
2. **Suggest features** — open an issue explaining the use case
3. **Submit a PR** — fork, create a branch, code, test, pull request

Please follow the existing conventions:
- TypeScript strict mode — no `any` without justification
- No external UI libraries — custom CSS only
- All visible text must use `t.key` from `src/i18n/translations.ts`
- New i18n keys must be added to all 15 languages
- Run `npm test` — all 347 tests must pass
- Run `npm run build` before submitting — zero TypeScript errors required

---

## Support the Creator ⚡

Merka is free software built with passion for a better, open internet. If it helps you, please consider supporting the original creator:

| Method | Address |
|--------|---------|
| ⚡ Lightning (Zap) | `smarteranswer31@walletofsatoshi.com` |
| ₿ Bitcoin (on-chain) | `bc1qxdmvlzvm4p9tle5vxfh0tyns3lwryet8886vrv` |
| 🟣 Nostr | `npub16djn9xucugk5wp76x0trhvy5eldv3juzwq92jng72ax26puzeyls327tm6` |

> **If you fork or deploy your own version of Merka**, please keep the donation addresses visible in the app's "About Merka" screen so the original creator continues to receive support from the community.

---

## License

This project is licensed under the **MIT License** — see [LICENSE.md](LICENSE.md) for full details.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software. The only requirement is to keep the copyright notice and permission notice in all copies or substantial portions of the software.

---

<div align="center">
  <p>Built with ❤️ on the Nostr protocol · No borders · No intermediaries · No barriers</p>
  <p>
    <a href="https://nostr.com">nostr.com</a> ·
    <a href="https://primal.net/p/npub16djn9xucugk5wp76x0trhvy5eldv3juzwq92jng72ax26puzeyls327tm6">Nostr Profile</a>
  </p>
</div>
