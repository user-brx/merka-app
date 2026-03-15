/**
 * Testes de UnlockKeyModal (NIP-49).
 * Cobre: botão desabilitado sem senha, unlock com senha, exibição de erro,
 * "usar outra chave", Enter key e toggle de visibilidade.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnlockKeyModal } from './UnlockKeyModal';
import type { Translations } from '../../../i18n/translations';

const t = {
    unlockTitle: 'Desbloquear Conta',
    unlockDesc: 'Digite a senha para acessar a conta salva.',
    unlockBtn: 'Desbloquear',
    unlockError: 'Senha incorreta.',
    unlockUseOtherKey: 'Usar outra chave',
} as unknown as Translations;

function renderModal(onUnlock = vi.fn(), onUseOtherKey = vi.fn(), error?: string) {
    return {
        onUnlock, onUseOtherKey,
        ...render(<UnlockKeyModal t={t} onUnlock={onUnlock} onUseOtherKey={onUseOtherKey} error={error} />),
    };
}

// ── Renderização ──────────────────────────────────────────────────────────────
describe('UnlockKeyModal — renderização', () => {
    it('deve exibir o título de desbloqueio', () => {
        renderModal();
        expect(screen.getByText(/Desbloquear Conta/)).toBeInTheDocument();
    });

    it('deve ter botão "Desbloquear" desabilitado com campo vazio', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /Desbloquear/i })).toBeDisabled();
    });

    it('deve ter botão "Usar outra chave" habilitado', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /Usar outra chave/i })).not.toBeDisabled();
    });

    it('deve NÃO exibir mensagem de erro quando prop error está ausente', () => {
        renderModal();
        expect(screen.queryByText(/Senha incorreta/)).not.toBeInTheDocument();
    });
});

// ── Exibição de erro ──────────────────────────────────────────────────────────
describe('UnlockKeyModal — exibição de erro', () => {
    it('deve exibir mensagem de erro quando prop error é fornecida', () => {
        renderModal(vi.fn(), vi.fn(), 'Senha incorreta.');
        expect(screen.getByText(/Senha incorreta/)).toBeInTheDocument();
    });

    it('deve exibir qualquer string de erro passada via prop', () => {
        renderModal(vi.fn(), vi.fn(), 'Falha de descriptografia NIP-49.');
        expect(screen.getByText(/Falha de descriptografia NIP-49/)).toBeInTheDocument();
    });
});

// ── Desbloqueio com senha ─────────────────────────────────────────────────────
describe('UnlockKeyModal — desbloqueio', () => {
    it('deve chamar onUnlock com a senha digitada ao clicar em Desbloquear', async () => {
        const { onUnlock } = renderModal();
        await userEvent.type(screen.getByPlaceholderText('••••••••'), 'minha-senha');
        fireEvent.click(screen.getByRole('button', { name: /Desbloquear/i }));

        expect(onUnlock).toHaveBeenCalledOnce();
        expect(onUnlock).toHaveBeenCalledWith('minha-senha');
    });

    it('deve habilitar o botão quando senha é digitada', async () => {
        renderModal();
        await userEvent.type(screen.getByPlaceholderText('••••••••'), 'x');
        expect(screen.getByRole('button', { name: /Desbloquear/i })).not.toBeDisabled();
    });

    it('deve chamar onUnlock ao pressionar Enter com senha preenchida', async () => {
        const { onUnlock } = renderModal();
        const input = screen.getByPlaceholderText('••••••••');
        await userEvent.type(input, 'senha123');
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onUnlock).toHaveBeenCalledWith('senha123');
    });

    it('não deve chamar onUnlock ao pressionar Enter com campo vazio', () => {
        const { onUnlock } = renderModal();
        fireEvent.keyDown(screen.getByPlaceholderText('••••••••'), { key: 'Enter' });
        expect(onUnlock).not.toHaveBeenCalled();
    });
});

// ── Usar outra chave ──────────────────────────────────────────────────────────
describe('UnlockKeyModal — usar outra chave', () => {
    it('deve chamar onUseOtherKey ao clicar no botão', () => {
        const { onUseOtherKey } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Usar outra chave/i }));
        expect(onUseOtherKey).toHaveBeenCalledOnce();
    });

    it('não deve chamar onUnlock ao clicar em "Usar outra chave"', () => {
        const { onUnlock } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Usar outra chave/i }));
        expect(onUnlock).not.toHaveBeenCalled();
    });
});

// ── Toggle de visibilidade da senha ──────────────────────────────────────────
describe('UnlockKeyModal — toggle senha', () => {
    it('deve iniciar com campo do tipo password', () => {
        renderModal();
        expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });

    it('deve alternar para text ao clicar em mostrar senha', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
        expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    });

    it('deve voltar para password ao clicar novamente', () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
        fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
        expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });
});
