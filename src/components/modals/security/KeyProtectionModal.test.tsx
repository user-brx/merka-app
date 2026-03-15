/**
 * Testes de KeyProtectionModal (NIP-49).
 * Cobre: validação de senha, mismatch, submit, skip e toggle de visibilidade.
 * Esta é a porta de entrada para criptografia local do nsec — cobertura crítica.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyProtectionModal } from './KeyProtectionModal';
import type { Translations } from '../../../i18n/translations';

const t = {
    protectKeyTitle: 'Proteger Chave',
    protectKeyDesc: 'Adicione uma senha para criptografar sua chave privada.',
    protectKeyPassword: 'Senha',
    protectKeyConfirm: 'Confirmar senha',
    protectKeyBtn: 'Proteger chave',
    protectKeyMismatch: 'Senhas não coincidem.',
    protectKeyTooShort: 'Mínimo 6 caracteres.',
    skipProtection: 'Salvar sem senha',
} as unknown as Translations;

function renderModal(onProtect = vi.fn(), onSkip = vi.fn()) {
    return { onProtect, onSkip, ...render(<KeyProtectionModal t={t} onProtect={onProtect} onSkip={onSkip} />) };
}

// ── Renderização ──────────────────────────────────────────────────────────────
describe('KeyProtectionModal — renderização', () => {
    it('deve exibir o título de proteção de chave', () => {
        renderModal();
        expect(screen.getByText(/Proteger Chave/)).toBeInTheDocument();
    });

    it('deve ter dois campos de senha (password + confirm)', () => {
        renderModal();
        const inputs = screen.getAllByPlaceholderText('••••••••');
        expect(inputs).toHaveLength(2);
    });

    it('deve ter botão "Proteger chave" desabilitado com campo vazio', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /Proteger chave/i })).toBeDisabled();
    });

    it('deve ter botão "Salvar sem senha" habilitado', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /Salvar sem senha/i })).not.toBeDisabled();
    });
});

// ── Validação de senha ────────────────────────────────────────────────────────
describe('KeyProtectionModal — validação', () => {
    it('deve exibir erro quando senha tem menos de 6 caracteres', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, '12345');
        await userEvent.type(confirmInput, '12345');
        fireEvent.click(screen.getByRole('button', { name: /Proteger chave/i }));

        expect(screen.getByText(/Mínimo 6 caracteres/)).toBeInTheDocument();
        expect(onProtect).not.toHaveBeenCalled();
    });

    it('deve exibir erro quando senhas não coincidem', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, 'senha123');
        await userEvent.type(confirmInput, 'senhaXXX');
        fireEvent.click(screen.getByRole('button', { name: /Proteger chave/i }));

        expect(screen.getByText(/Senhas não coincidem/)).toBeInTheDocument();
        expect(onProtect).not.toHaveBeenCalled();
    });

    it('deve chamar onProtect com a senha correta quando válida', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, 'senha-segura');
        await userEvent.type(confirmInput, 'senha-segura');
        fireEvent.click(screen.getByRole('button', { name: /Proteger chave/i }));

        expect(onProtect).toHaveBeenCalledOnce();
        expect(onProtect).toHaveBeenCalledWith('senha-segura');
    });

    it('deve limpar o erro ao começar a digitar novamente', async () => {
        renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, '123'); // too short
        await userEvent.type(confirmInput, '123');
        fireEvent.click(screen.getByRole('button', { name: /Proteger chave/i }));
        expect(screen.getByText(/Mínimo 6 caracteres/)).toBeInTheDocument();

        await userEvent.type(pwInput, '456'); // start typing — error should clear
        expect(screen.queryByText(/Mínimo 6 caracteres/)).not.toBeInTheDocument();
    });

    it('deve aceitar senha com exatamente 6 caracteres', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, 'abc123');
        await userEvent.type(confirmInput, 'abc123');
        fireEvent.click(screen.getByRole('button', { name: /Proteger chave/i }));

        expect(screen.queryByText(/Mínimo/)).not.toBeInTheDocument();
        expect(onProtect).toHaveBeenCalledWith('abc123');
    });
});

// ── Submit via Enter ──────────────────────────────────────────────────────────
describe('KeyProtectionModal — Enter key', () => {
    it('deve submeter ao pressionar Enter no campo de senha', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, 'minha-senha');
        await userEvent.type(confirmInput, 'minha-senha');
        fireEvent.keyDown(pwInput, { key: 'Enter' });

        expect(onProtect).toHaveBeenCalledWith('minha-senha');
    });

    it('deve submeter ao pressionar Enter no campo de confirmação', async () => {
        const { onProtect } = renderModal();
        const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');

        await userEvent.type(pwInput, 'minha-senha');
        await userEvent.type(confirmInput, 'minha-senha');
        fireEvent.keyDown(confirmInput, { key: 'Enter' });

        expect(onProtect).toHaveBeenCalledWith('minha-senha');
    });
});

// ── Skip (salvar sem senha) ───────────────────────────────────────────────────
describe('KeyProtectionModal — skip', () => {
    it('deve chamar onSkip ao clicar em "Salvar sem senha"', () => {
        const { onSkip } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Salvar sem senha/i }));
        expect(onSkip).toHaveBeenCalledOnce();
    });

    it('não deve chamar onProtect ao pular', () => {
        const { onProtect } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Salvar sem senha/i }));
        expect(onProtect).not.toHaveBeenCalled();
    });
});

// ── Toggle de visibilidade da senha ──────────────────────────────────────────
describe('KeyProtectionModal — toggle senha', () => {
    it('deve iniciar com campos do tipo password (ocultos)', () => {
        renderModal();
        const inputs = screen.getAllByPlaceholderText('••••••••');
        inputs.forEach(input => expect(input).toHaveAttribute('type', 'password'));
    });

    it('deve alternar para type=text ao clicar no botão de visibilidade', () => {
        renderModal();
        const toggleBtn = screen.getByRole('button', { name: /Show password/i });
        fireEvent.click(toggleBtn);

        const inputs = screen.getAllByPlaceholderText('••••••••');
        inputs.forEach(input => expect(input).toHaveAttribute('type', 'text'));
    });

    it('deve voltar para type=password ao clicar novamente', () => {
        renderModal();
        const toggleBtn = screen.getByRole('button', { name: /Show password/i });
        fireEvent.click(toggleBtn);
        fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));

        const inputs = screen.getAllByPlaceholderText('••••••••');
        inputs.forEach(input => expect(input).toHaveAttribute('type', 'password'));
    });
});
