/**
 * Testes de comportamento do ChatPanel (NIP-17 DM UI).
 * Foca em: lifecycle da subscription, envio otimista, reversão em falha,
 * deduplicação de mensagens, expand/collapse de mensagens longas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { ChatPanel } from './ChatPanel';
import type { Translations } from '../../i18n/translations';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSubscribeToConversation = vi.hoisted(() => vi.fn((_sk: any, _pk: any, _handler: any) => vi.fn()));
const mockPublishEncryptedDM = vi.hoisted(() => vi.fn((_sk: any, _pk: any, _msg: any) => Promise.resolve(true)));

vi.mock('../../services/nostr/nostr', () => ({
    subscribeToConversation: mockSubscribeToConversation,
    publishEncryptedDM: mockPublishEncryptedDM,
    fetchProfile: vi.fn((_pk, cb) => cb({})),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mySk = generateSecretKey();
const myPk = getPublicKey(mySk);
const myKeys = { sk: mySk, pk: myPk, nsec: 'nsec1test', npub: nip19.npubEncode(myPk) };

const targetSk = generateSecretKey();
const targetPk = getPublicKey(targetSk);

const t = {
    typeMsg: 'Escreva uma mensagem...',
    e2eNotice: 'Criptografia ponta a ponta',
    noMsgs: 'Nenhuma mensagem ainda',
    collapse: 'Ver menos',
    expand: 'Ver mais',
} as unknown as Translations;

function renderChat(overrides?: { targetPubkey?: string; targetLabel?: string }) {
    return render(
        <ChatPanel
            t={t}
            myKeys={myKeys}
            targetPubkey={overrides?.targetPubkey ?? targetPk}
            targetLabel={overrides?.targetLabel ?? 'Alice'}
            onClose={vi.fn()}
        />
    );
}

// ── Lifecycle da subscription ─────────────────────────────────────────────────
describe('ChatPanel — lifecycle da subscription', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockClear();
        mockSubscribeToConversation.mockReturnValue(vi.fn());
        mockPublishEncryptedDM.mockClear();
        mockPublishEncryptedDM.mockResolvedValue(true);
    });

    it('deve chamar subscribeToConversation na montagem com chave e targetPubkey corretos', () => {
        renderChat();
        expect(mockSubscribeToConversation).toHaveBeenCalledOnce();
        const [sk, pk] = mockSubscribeToConversation.mock.calls[0];
        expect(sk).toBe(mySk);
        expect(pk).toBe(targetPk);
    });

    it('deve chamar cleanup (unsub) na desmontagem (sem memory leak)', () => {
        const mockUnsub = vi.fn();
        mockSubscribeToConversation.mockReturnValue(mockUnsub);

        const { unmount } = renderChat();
        expect(mockUnsub).not.toHaveBeenCalled();
        unmount();
        expect(mockUnsub).toHaveBeenCalledOnce();
    });

    it('deve re-assinar quando targetPubkey muda', () => {
        const { pk: newTargetPk } = { pk: getPublicKey(generateSecretKey()) };
        const { rerender } = renderChat();

        rerender(
            <ChatPanel t={t} myKeys={myKeys} targetPubkey={newTargetPk} targetLabel="Bob" onClose={vi.fn()} />
        );

        // subscribeToConversation called twice: initial + after rerender
        expect(mockSubscribeToConversation).toHaveBeenCalledTimes(2);
        expect(mockSubscribeToConversation.mock.calls[1][1]).toBe(newTargetPk);
    });

    it('deve limpar mensagens ao abrir nova conversa (targetPubkey muda)', async () => {
        let capturedHandler: ((rumor: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, handler: any) => {
            capturedHandler = handler;
            return vi.fn();
        });

        const { rerender } = renderChat();

        // Inject a message
        act(() => {
            capturedHandler!({
                id: 'msg1', pubkey: targetPk, content: 'Olá!', created_at: 1000, tags: [],
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Olá!')).toBeInTheDocument();
        });

        // Change conversation target — messages should clear
        const newTargetPk = getPublicKey(generateSecretKey());
        rerender(
            <ChatPanel t={t} myKeys={myKeys} targetPubkey={newTargetPk} targetLabel="Bob" onClose={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.queryByText('Olá!')).not.toBeInTheDocument();
        });
    });
});

// ── Renderização inicial ───────────────────────────────────────────────────────
describe('ChatPanel — renderização', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockReturnValue(vi.fn());
    });

    it('deve exibir o nome do destinatário no cabeçalho', () => {
        renderChat({ targetLabel: 'Alice Satoshi' });
        expect(screen.getByText(/Alice Satoshi/)).toBeInTheDocument();
    });

    it('deve exibir o aviso de criptografia ponta a ponta', () => {
        renderChat();
        expect(screen.getByText(t.e2eNotice)).toBeInTheDocument();
    });

    it('deve exibir mensagem de estado vazio quando não há mensagens', () => {
        renderChat();
        expect(screen.getByText(t.noMsgs)).toBeInTheDocument();
    });

    it('deve exibir o placeholder correto no textarea', () => {
        renderChat();
        expect(screen.getByPlaceholderText(t.typeMsg)).toBeInTheDocument();
    });

    it('deve ter o botão de envio desabilitado quando input está vazio', () => {
        renderChat();
        const btn = screen.getByRole('button', { name: '↑' });
        expect(btn).toBeDisabled();
    });
});

// ── Recebimento de mensagens via subscription ─────────────────────────────────
describe('ChatPanel — recebimento de mensagens', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockClear();
    });

    it('deve exibir mensagem recebida do outro usuário com estilo "theirs"', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        act(() => {
            handler!({ id: 'r1', pubkey: targetPk, content: 'Oi!', created_at: 1000, tags: [] });
        });

        await waitFor(() => {
            expect(screen.getByText('Oi!')).toBeInTheDocument();
        });
    });

    it('deve exibir mensagem enviada por mim com estilo "mine"', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        act(() => {
            handler!({ id: 's1', pubkey: myPk, content: 'Olá!', created_at: 1001, tags: [] });
        });

        await waitFor(() => {
            expect(screen.getByText('Olá!')).toBeInTheDocument();
        });
    });

    it('deve desduplicar mensagens com mesmo id (seen Set)', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        const msg = { id: 'dup1', pubkey: targetPk, content: 'Duplicado', created_at: 1000, tags: [] };
        act(() => {
            handler!(msg);
            handler!(msg); // mesmo id — deve ser ignorado
        });

        await waitFor(() => {
            const els = screen.getAllByText('Duplicado');
            expect(els).toHaveLength(1);
        });
    });

    it('deve ordenar mensagens por created_at crescente', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        act(() => {
            handler!({ id: 'm2', pubkey: targetPk, content: 'Segunda', created_at: 2000, tags: [] });
            handler!({ id: 'm1', pubkey: targetPk, content: 'Primeira', created_at: 1000, tags: [] });
        });

        await waitFor(() => {
            const bubbles = screen.getAllByText(/Primeira|Segunda/);
            expect(bubbles[0].textContent).toBe('Primeira');
            expect(bubbles[1].textContent).toBe('Segunda');
        });
    });
});

// ── Envio de mensagem ─────────────────────────────────────────────────────────
describe('ChatPanel — envio de mensagem', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockReturnValue(vi.fn());
        mockPublishEncryptedDM.mockClear();
        mockPublishEncryptedDM.mockResolvedValue(true);
    });

    it('deve enviar mensagem ao clicar no botão de envio', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'Olá mundo');

        const btn = screen.getByRole('button', { name: '↑' });
        await userEvent.click(btn);

        expect(mockPublishEncryptedDM).toHaveBeenCalledOnce();
        const [sk, pk, msg] = mockPublishEncryptedDM.mock.calls[0];
        expect(sk).toBe(mySk);
        expect(pk).toBe(targetPk);
        expect(msg).toBe('Olá mundo');
    });

    it('deve enviar mensagem ao pressionar Enter (sem Shift)', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'Mensagem via Enter');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        await waitFor(() => {
            expect(mockPublishEncryptedDM).toHaveBeenCalledOnce();
        });
        expect(mockPublishEncryptedDM.mock.calls[0][2]).toBe('Mensagem via Enter');
    });

    it('não deve enviar ao pressionar Shift+Enter (quebra de linha)', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'Linha 1');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

        expect(mockPublishEncryptedDM).not.toHaveBeenCalled();
    });

    it('não deve enviar mensagem vazia ou com apenas espaços', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, '   ');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(mockPublishEncryptedDM).not.toHaveBeenCalled();
    });

    it('deve limpar o input após envio bem-sucedido', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Mensagem teste');

        const btn = screen.getByRole('button', { name: '↑' });
        await userEvent.click(btn);

        await waitFor(() => {
            expect(textarea.value).toBe('');
        });
    });

    it('deve exibir mensagem otimista antes da confirmação do relay', async () => {
        // Never resolves during this test — verifies optimistic display
        mockPublishEncryptedDM.mockReturnValue(new Promise(() => { /* pending */ }));
        renderChat();

        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'Mensagem otimista');

        const btn = screen.getByRole('button', { name: '↑' });
        fireEvent.click(btn);

        // Optimistic message should appear immediately, before relay confirmation
        await waitFor(() => {
            expect(screen.getByText('Mensagem otimista')).toBeInTheDocument();
        });
    });
});

// ── Reversão em caso de falha ─────────────────────────────────────────────────
describe('ChatPanel — reversão em falha de envio', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockReturnValue(vi.fn());
        mockPublishEncryptedDM.mockClear();
    });

    it('deve remover mensagem otimista e restaurar input quando relay rejeita', async () => {
        mockPublishEncryptedDM.mockResolvedValue(false); // relay recusa
        renderChat();

        const textarea = screen.getByPlaceholderText(t.typeMsg) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Vai falhar');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: '↑' }));
        });

        // Input text should be restored after failure
        await waitFor(() => {
            expect(textarea.value).toBe('Vai falhar');
        });

        // No chat bubble with "Vai falhar" should remain (textarea is not a bubble)
        await waitFor(() => {
            const bubbles = document.querySelectorAll('.chat-bubble');
            const hasFailedBubble = Array.from(bubbles).some(b => b.textContent?.includes('Vai falhar'));
            expect(hasFailedBubble).toBe(false);
        });
    });
});

// ── Expand/Collapse de mensagens longas ──────────────────────────────────────
describe('ChatPanel — expand/collapse de mensagens longas', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockClear();
    });

    it('deve truncar mensagens com mais de 140 caracteres', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        const longMsg = 'A'.repeat(200);
        act(() => {
            handler!({ id: 'long1', pubkey: targetPk, content: longMsg, created_at: 1000, tags: [] });
        });

        await waitFor(() => {
            // Should show truncated version + ellipsis, not full 200 chars
            expect(screen.queryByText(longMsg)).not.toBeInTheDocument();
            expect(screen.getByText(/A{140}…/)).toBeInTheDocument();
        });
    });

    it('deve expandir mensagem longa ao clicar nela', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        const longMsg = 'B'.repeat(200);
        act(() => {
            handler!({ id: 'long2', pubkey: targetPk, content: longMsg, created_at: 1000, tags: [] });
        });

        await waitFor(() => {
            expect(screen.getByText(/▼/)).toBeInTheDocument();
        });

        // Click to expand
        const bubble = screen.getByText(/B{140}…/).closest('.chat-bubble')!;
        fireEvent.click(bubble);

        await waitFor(() => {
            expect(screen.getByText(longMsg)).toBeInTheDocument();
            expect(screen.getByText(/▲/)).toBeInTheDocument();
        });
    });

    it('deve colapsar mensagem expandida ao clicar novamente', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        const longMsg = 'C'.repeat(200);
        act(() => {
            handler!({ id: 'long3', pubkey: targetPk, content: longMsg, created_at: 1000, tags: [] });
        });

        await waitFor(() => expect(screen.getByText(/▼/)).toBeInTheDocument());

        const bubble = screen.getByText(/C{140}…/).closest('.chat-bubble')!;
        fireEvent.click(bubble); // expand

        await waitFor(() => expect(screen.getByText(longMsg)).toBeInTheDocument());

        fireEvent.click(screen.getByText(longMsg).closest('.chat-bubble')!); // collapse

        await waitFor(() => {
            expect(screen.queryByText(longMsg)).not.toBeInTheDocument();
            expect(screen.getByText(/▼/)).toBeInTheDocument();
        });
    });

    it('não deve exibir botão expand/collapse para mensagens curtas', async () => {
        let handler: ((r: any) => void) | null = null;
        mockSubscribeToConversation.mockImplementation((_sk: any, _pk: any, h: any) => {
            handler = h;
            return vi.fn();
        });

        renderChat();

        act(() => {
            handler!({ id: 'short1', pubkey: targetPk, content: 'Mensagem curta', created_at: 1000, tags: [] });
        });

        await waitFor(() => {
            expect(screen.getByText('Mensagem curta')).toBeInTheDocument();
            expect(screen.queryByText(/▼|▲/)).not.toBeInTheDocument();
        });
    });
});

// ── Estado do botão de envio ──────────────────────────────────────────────────
describe('ChatPanel — estado do botão de envio', () => {
    beforeEach(() => {
        mockSubscribeToConversation.mockReturnValue(vi.fn());
        mockPublishEncryptedDM.mockReturnValue(new Promise(() => { /* pending */ }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve desabilitar o botão durante o envio (evitar duplo envio)', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'Teste');

        const btn = screen.getByRole('button', { name: '↑' });
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: '...' })).toBeDisabled();
        });
    });

    it('deve habilitar o botão quando há texto no input', async () => {
        renderChat();
        const textarea = screen.getByPlaceholderText(t.typeMsg);
        await userEvent.type(textarea, 'x');

        const btn = screen.getByRole('button', { name: '↑' });
        expect(btn).not.toBeDisabled();
    });
});
