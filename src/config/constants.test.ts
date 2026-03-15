/**
 * Testes das constantes do app.
 * Garante que MERKA_PUBKEY é decodificado corretamente do MERKA_NPUB,
 * que APP_GUID está no formato esperado, e que endereços de doação estão presentes.
 */
import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';

import {
    APP_GUID,
    MERKA_NPUB,
    MERKA_PUBKEY,
    DONATION_LN,
    DONATION_BTC,
} from './constants';

describe('APP_GUID', () => {
    it('deve ter o formato correto (merka-app-[hex])', () => {
        expect(APP_GUID).toMatch(/^merka-app-[0-9a-f]+$/);
    });

    it('deve ter exatamente 8 caracteres de sufixo hex', () => {
        const suffix = APP_GUID.replace('merka-app-', '');
        expect(suffix).toHaveLength(8);
        expect(suffix).toMatch(/^[0-9a-f]{8}$/);
    });

    it('não deve mudar entre importações (é uma constante estável)', async () => {
        const { APP_GUID: again } = await import('./constants');
        expect(again).toBe(APP_GUID);
    });
});

describe('MERKA_NPUB', () => {
    it('deve ter prefixo npub1', () => {
        expect(MERKA_NPUB.startsWith('npub1')).toBe(true);
    });

    it('deve ser decodificável como npub válido', () => {
        const decoded = nip19.decode(MERKA_NPUB);
        expect(decoded.type).toBe('npub');
        expect(decoded.data).toBeTruthy();
    });
});

describe('MERKA_PUBKEY', () => {
    it('deve ser uma string hex de 64 caracteres', () => {
        expect(MERKA_PUBKEY).toMatch(/^[0-9a-f]{64}$/);
    });

    it('deve corresponder ao pubkey derivado do MERKA_NPUB', () => {
        const { type, data } = nip19.decode(MERKA_NPUB);
        expect(type).toBe('npub');
        expect(MERKA_PUBKEY).toBe(data as string);
    });

    it('não deve ser string vazia (falha de decodificação)', () => {
        expect(MERKA_PUBKEY).not.toBe('');
        expect(MERKA_PUBKEY.length).toBeGreaterThan(0);
    });
});

describe('DONATION_LN', () => {
    it('deve ser um endereço Lightning válido (lud16 format: user@domain)', () => {
        expect(DONATION_LN).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });

    it('não deve ser placeholder ou string vazia', () => {
        expect(DONATION_LN).not.toBe('');
        expect(DONATION_LN.toLowerCase()).not.toContain('placeholder');
        expect(DONATION_LN.toLowerCase()).not.toContain('todo');
    });
});

describe('DONATION_BTC', () => {
    it('deve ser um endereço Bitcoin válido (bech32 nativo bc1q... ou bc1p...)', () => {
        // bc1q = P2WPKH, bc1p = P2TR (Taproot)
        expect(DONATION_BTC).toMatch(/^bc1[qp][0-9a-z]{6,}/);
    });

    it('não deve ser placeholder ou string vazia', () => {
        expect(DONATION_BTC).not.toBe('');
        expect(DONATION_BTC.toLowerCase()).not.toContain('placeholder');
        expect(DONATION_BTC.toLowerCase()).not.toContain('todo');
    });

    it('deve ter comprimento mínimo de um endereço bech32 válido (26+ chars)', () => {
        expect(DONATION_BTC.length).toBeGreaterThanOrEqual(26);
    });
});
