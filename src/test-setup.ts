import '@testing-library/jest-dom';
// @ts-ignore - crypto module not typed for browser globalThis
import crypto from 'crypto';
// @ts-ignore - util module not typed for browser globalThis
import { TextEncoder, TextDecoder } from 'util';
// @ts-ignore - ws package not typed as globalThis.WebSocket
import WebSocket from 'ws';

if (!globalThis.crypto) {
  // @ts-ignore - assigning webcrypto to globalThis.crypto
  globalThis.crypto = crypto.webcrypto as typeof globalThis.crypto;
}

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
  // @ts-ignore - assigning util TextDecoder to globalThis.TextDecoder
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

// Sobrescreve WebSocket nativo no node 21+ pelo pacote ws para evitar bugs no JSDOM (TypeError: The "event" argument must be an instance of Event)
// @ts-ignore - ws WebSocket is not identical to browser WebSocket type
globalThis.WebSocket = WebSocket;

// jsdom não implementa scrollIntoView — mock necessário para componentes que fazem auto-scroll
window.HTMLElement.prototype.scrollIntoView = function () { /* no-op in jsdom */ };
