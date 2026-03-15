/**
 * Testes do ZapModal (NIP-57).
 * Cobre: renderização inicial, busca de perfil, seleção de valor, fluxo de criação de
 * invoice, cópia, integração WebLN, tratamento de erros e fechamento do modal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Mocks hoisted (devem ser declarados antes dos imports do módulo) ────────────
const mockGetLnurlEndpoint = vi.hoisted(() => vi.fn());
const mockFetchLnurlPayMetadata = vi.hoisted(() => vi.fn());
const mockCreateZapRequest = vi.hoisted(() => vi.fn());
const mockFetchZapInvoice = vi.hoisted(() => vi.fn());
const mockFetchProfile = vi.hoisted(() => vi.fn());

vi.mock('../../services/nostr/zap', () => ({
    getLnurlEndpoint: mockGetLnurlEndpoint,
    fetchLnurlPayMetadata: mockFetchLnurlPayMetadata,
    createZapRequest: mockCreateZapRequest,
    fetchZapInvoice: mockFetchZapInvoice,
}));

vi.mock('../../services/nostr/nostr', () => ({
    fetchProfile: mockFetchProfile,
}));

vi.mock('qrcode.react', () => ({
    QRCodeSVG: ({ value }: { value: string }) => (
        <div data-testid="qrcode" data-value={value} />
    ),
}));

import { ZapModal } from './ZapModal';
import type { Translations } from '../../i18n/translations';

// ── Fixtures ───────────────────────────────────────────────────────────────────
const sk = new Uint8Array(32).fill(1);
const pk = 'aaaa1234567890abcdef1234567890abcdef1234567890abcdef1234567890aa';
const myKeys = { sk, pk };

const targetNpub = 'npub1qqqqmocktest1234567890abcdef';
const targetPubkey = 'bbbb1234567890abcdef1234567890abcdef1234567890abcdef1234567890bb';
const testLud16 = 'satoshi@wallet.com';
const testInvoice = 'lnbc210n1ptest_invoice_hash_abcdefghijklmnop12345';
const testBitcoinAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

const ENDPOINT = 'https://wallet.com/.well-known/lnurlp/satoshi';
const CALLBACK = 'https://wallet.com/lnurlp/callback';

const t = {
    zapTitle: 'Enviar Zap ⚡',
    scanToPay: 'Escanear QR com carteira:',
    zapAmount: 'Valor (sats)',
    zapComment: 'Comentário (opcional)',
    fetchInvoice: 'Gerar Invoice',
    copyInvoice: 'Copiar Invoice',
    payWithWallet: 'Pagar com Carteira',
    loginToZapDirectly: 'Faça login para zap direto.',
    zapInfo: 'Escaneie para enviar um zap.',
    zapPubkey: 'Chave pública Nostr',
    close: 'Fechar',
    bitcoinOnchain: 'Bitcoin On-chain',
    bitcoinScanToPay: 'Escaneie o QR com uma carteira Bitcoin:',
} as unknown as Translations;

type RenderProps = {
    lud16?: string;
    keys?: { sk: Uint8Array; pk: string } | null;
    onClose?: () => void;
    noteId?: string;
};

function renderZap({ lud16, keys = myKeys, onClose = vi.fn(), noteId }: RenderProps = {}) {
    const result = render(
        <ZapModal
            t={t}
            targetNpub={targetNpub}
            targetPubkey={targetPubkey}
            myKeys={keys}
            onClose={onClose}
            lud16={lud16}
            noteId={noteId}
        />,
    );
    return { onClose, ...result };
}

/** Configura todos os serviços de zap para retornar sucesso. */
function mockZapSuccess() {
    mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
    mockFetchLnurlPayMetadata.mockResolvedValue({
        callback: CALLBACK,
        minSendable: 1000,
        maxSendable: 10_000_000_000,
    });
    mockCreateZapRequest.mockReturnValue({ id: 'zap-req-id', kind: 9734 });
    mockFetchZapInvoice.mockResolvedValue(testInvoice);
}

// ── Setup ──────────────────────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        writable: true,
        configurable: true,
    });
    // Remove WebLN entre os testes para garantir isolamento
    delete (window as any).webln;
});

// ── Renderização: sem lud16 ────────────────────────────────────────────────────
describe('ZapModal — sem lud16 (endereço Lightning desconhecido)', () => {
    it('deve exibir o título do modal', () => {
        renderZap({ lud16: undefined, keys: null });
        expect(screen.getByText(/Enviar Zap/)).toBeInTheDocument();
    });

    it('deve exibir texto de instrução e o npub do destinatário', () => {
        renderZap({ lud16: undefined, keys: null });
        expect(screen.getByText(t.zapInfo as string)).toBeInTheDocument();
        expect(screen.getByText(targetNpub)).toBeInTheDocument();
    });

    it('não deve exibir campos de valor ou botão de invoice', () => {
        renderZap({ lud16: undefined, keys: null });
        expect(screen.queryByText(t.fetchInvoice as string)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/sats/i)).not.toBeInTheDocument();
    });

    it('deve copiar o npub ao clicar no botão de cópia', async () => {
        renderZap({ lud16: undefined, keys: null });
        // O código do npub está numa tag <code> dentro de um container
        // com um botão de cópia ao lado — clicamos no único btn-icon da área
        const codeEl = screen.getByText(targetNpub);
        const copyBtn = codeEl.parentElement!.querySelector('button')!;
        await act(async () => { fireEvent.click(copyBtn); });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(targetNpub);
    });
});

// ── Renderização: com lud16 ────────────────────────────────────────────────────
describe('ZapModal — com lud16, sem myKeys', () => {
    it('deve exibir QR code do endereço Lightning', () => {
        renderZap({ lud16: testLud16, keys: null });
        const qr = screen.getByTestId('qrcode');
        expect(qr).toHaveAttribute('data-value', `lightning:${testLud16}`);
    });

    it('deve exibir o endereço lud16 em texto', () => {
        renderZap({ lud16: testLud16, keys: null });
        expect(screen.getByText(testLud16)).toBeInTheDocument();
    });

    it('deve exibir mensagem de login em vez do formulário', () => {
        renderZap({ lud16: testLud16, keys: null });
        expect(screen.getByText(t.loginToZapDirectly as string)).toBeInTheDocument();
        expect(screen.queryByText(t.fetchInvoice as string)).not.toBeInTheDocument();
    });
});

describe('ZapModal — com lud16 e myKeys', () => {
    it('deve exibir o formulário de valor e botão de invoice', () => {
        renderZap({ lud16: testLud16 });
        expect(screen.getByText(t.fetchInvoice as string)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t.zapComment as string)).toBeInTheDocument();
    });

    it('deve exibir os quatro botões de valor predefinido', () => {
        renderZap({ lud16: testLud16 });
        for (const val of [21, 100, 1000, 5000]) {
            expect(screen.getByRole('button', { name: String(val) })).toBeInTheDocument();
        }
    });
});

// ── Busca de perfil ────────────────────────────────────────────────────────────
describe('ZapModal — busca de perfil quando lud16 não está disponível', () => {
    it('deve chamar fetchProfile com a pubkey correta', () => {
        renderZap({ lud16: undefined });
        expect(mockFetchProfile).toHaveBeenCalledWith(targetPubkey, expect.any(Function));
    });

    it('deve chamar fetchProfile para buscar endereço bitcoin mesmo quando lud16 já está disponível', () => {
        renderZap({ lud16: testLud16 });
        expect(mockFetchProfile).toHaveBeenCalledWith(targetPubkey, expect.any(Function));
    });

    it('deve exibir o formulário após receber lud16 pelo perfil', async () => {
        renderZap({ lud16: undefined });
        // Simula retorno do perfil via callback
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ lud16: testLud16 }); });

        await waitFor(() => {
            expect(screen.getByText(t.fetchInvoice as string)).toBeInTheDocument();
        });
    });

    it('não deve atualizar UI quando perfil retorna sem lud16', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ name: 'satoshi', picture: 'https://example.com/pic.jpg' }); });

        // Formulário não deve aparecer
        expect(screen.queryByText(t.fetchInvoice as string)).not.toBeInTheDocument();
        expect(screen.getByText(t.zapInfo as string)).toBeInTheDocument();
    });
});

// ── Seleção de valor ───────────────────────────────────────────────────────────
describe('ZapModal — seleção de valor', () => {
    it('deve selecionar preset 100 sats ao clicar no botão correspondente', () => {
        renderZap({ lud16: testLud16 });
        const btn100 = screen.getByRole('button', { name: '100' });
        fireEvent.click(btn100);
        const input = screen.getByDisplayValue('100');
        expect(input).toBeInTheDocument();
    });

    it('deve selecionar preset 1000 sats ao clicar no botão correspondente', () => {
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByRole('button', { name: '1000' }));
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('deve aceitar valor customizado digitado no input', () => {
        renderZap({ lud16: testLud16 });
        const input = screen.getByDisplayValue('21'); // valor inicial
        fireEvent.change(input, { target: { value: '500' } });
        expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });

    it('deve aceitar comentário no campo de texto', async () => {
        renderZap({ lud16: testLud16 });
        const commentInput = screen.getByPlaceholderText(t.zapComment as string);
        fireEvent.change(commentInput, { target: { value: 'ótimo conteúdo!' } });
        expect(commentInput).toHaveValue('ótimo conteúdo!');
    });
});

// ── Criação de invoice — caminho feliz ─────────────────────────────────────────
describe('ZapModal — criação de invoice (caminho feliz)', () => {
    it('deve exibir estado de loading ao clicar em Gerar Invoice', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        const btn = screen.getByText(t.fetchInvoice as string);
        fireEvent.click(btn);
        // Botão desabilitado durante loading
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /⏳/ })).toBeDisabled();
        });
    });

    it('deve exibir QR code da invoice após criação bem-sucedida', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            const qrcodes = screen.getAllByTestId('qrcode');
            const invoiceQr = qrcodes.find(el =>
                el.getAttribute('data-value') === `lightning:${testInvoice}`,
            );
            expect(invoiceQr).toBeDefined();
        });
    });

    it('deve exibir botão de copiar invoice após criação', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(new RegExp(t.copyInvoice as string))).toBeInTheDocument();
        });
    });

    it('deve passar noteId para createZapRequest quando fornecido', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16, noteId: 'noteid123' });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(mockCreateZapRequest).toHaveBeenCalledWith(
                myKeys.sk,
                targetPubkey,
                'noteid123',
                21,
                '',
            );
        });
    });

    it('deve passar comment para createZapRequest quando preenchido', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.change(
            screen.getByPlaceholderText(t.zapComment as string),
            { target: { value: 'incrível!' } },
        );
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(mockCreateZapRequest).toHaveBeenCalledWith(
                myKeys.sk,
                targetPubkey,
                undefined,
                21,
                'incrível!',
            );
        });
    });
});

// ── Tratamento de erros ────────────────────────────────────────────────────────
describe('ZapModal — tratamento de erros na criação de invoice', () => {
    it('deve exibir erro quando lud16 resulta em endpoint inválido', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(null);
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Invalid Lightning Address/i)).toBeInTheDocument();
        });
    });

    it('deve exibir erro quando provedor Lightning retorna JSON sem callback', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        // Provedor responde, mas sem campo callback no JSON
        mockFetchLnurlPayMetadata.mockResolvedValue({ tag: 'payRequest' });
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Lightning Provider did not respond/i)).toBeInTheDocument();
        });
    });

    it('deve exibir mensagem de rede quando provedor está inacessível', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        // Simula falha de rede (provedor bloqueado, offline, etc.)
        mockFetchLnurlPayMetadata.mockRejectedValue(new Error('Cannot reach wallet.com — check network or try another Lightning address'));
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Cannot reach wallet\.com/i)).toBeInTheDocument();
        });
    });

    it('deve exibir status HTTP quando provedor retorna erro de servidor', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        mockFetchLnurlPayMetadata.mockRejectedValue(new Error('LNURL server returned 404'));
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/LNURL server returned 404/i)).toBeInTheDocument();
        });
    });

    it('deve exibir erro quando valor está abaixo do mínimo do provedor', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        // minSendable = 100_000 msats = 100 sats; amount = 21 sats
        mockFetchLnurlPayMetadata.mockResolvedValue({ callback: CALLBACK, minSendable: 100_000 });
        renderZap({ lud16: testLud16 });
        // Mantém o valor padrão de 21 sats (abaixo do mínimo de 100 sats)
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Min amount is 100 sats/i)).toBeInTheDocument();
        });
    });

    it('deve exibir erro quando valor está acima do máximo do provedor', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        // maxSendable = 10_000 msats = 10 sats; amount = 21 sats
        mockFetchLnurlPayMetadata.mockResolvedValue({ callback: CALLBACK, maxSendable: 10_000 });
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Max amount is 10 sats/i)).toBeInTheDocument();
        });
    });

    it('deve exibir erro quando provedor não retorna invoice', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(ENDPOINT);
        mockFetchLnurlPayMetadata.mockResolvedValue({ callback: CALLBACK });
        mockCreateZapRequest.mockReturnValue({ id: 'zap-req-id', kind: 9734 });
        // fetchZapInvoice agora lança em vez de retornar null
        mockFetchZapInvoice.mockRejectedValue(new Error('Failed to get invoice from provider'));
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(/Failed to get invoice/i)).toBeInTheDocument();
        });
    });

    it('deve limpar erro anterior ao tentar novamente', async () => {
        // Primeira tentativa: falha
        mockGetLnurlEndpoint.mockResolvedValueOnce(null);
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));
        await waitFor(() => {
            expect(screen.getByText(/Invalid Lightning Address/i)).toBeInTheDocument();
        });

        // Segunda tentativa: sucesso
        mockZapSuccess();
        fireEvent.click(screen.getByText(t.fetchInvoice as string));
        await waitFor(() => {
            expect(screen.queryByText(/Invalid Lightning Address/i)).not.toBeInTheDocument();
        });
    });

    it('deve reabilitar o botão de invoice após erro (não fica em loading)', async () => {
        mockGetLnurlEndpoint.mockResolvedValue(null);
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(t.fetchInvoice as string)).not.toBeDisabled();
        });
    });
});

// ── Cópia de invoice ───────────────────────────────────────────────────────────
describe('ZapModal — cópia de invoice', () => {
    it('deve copiar a invoice ao clicar no botão de cópia', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(new RegExp(t.copyInvoice as string))).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(new RegExp(t.copyInvoice as string)));
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testInvoice);
    });

    it('deve exibir checkmark após copiar invoice', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(new RegExp(t.copyInvoice as string))).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(new RegExp(t.copyInvoice as string)));
        await waitFor(() => {
            // Ambos os botões de cópia (lud16 e invoice) compartilham o estado copied
            expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('deve copiar lud16 ao clicar no botão de cópia do endereço', async () => {
        renderZap({ lud16: testLud16 });
        const lud16El = screen.getByText(testLud16);
        const copyBtn = lud16El.parentElement!.querySelector('button')!;
        await act(async () => { fireEvent.click(copyBtn); });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testLud16);
    });
});

// ── WebLN ──────────────────────────────────────────────────────────────────────
describe('ZapModal — integração WebLN', () => {
    it('não deve exibir botão WebLN quando window.webln não está disponível', async () => {
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getAllByTestId('qrcode').some(
                el => el.getAttribute('data-value') === `lightning:${testInvoice}`,
            )).toBe(true);
        });

        expect(screen.queryByText(t.payWithWallet as string)).not.toBeInTheDocument();
    });

    it('deve exibir botão WebLN quando window.webln está disponível', async () => {
        (window as any).webln = {
            enable: vi.fn().mockResolvedValue(undefined),
            sendPayment: vi.fn().mockResolvedValue({ preimage: 'abc123' }),
        };
        mockZapSuccess();
        renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(t.payWithWallet as string)).toBeInTheDocument();
        });
    });

    it('deve chamar enable() e sendPayment() ao clicar em Pagar com Carteira', async () => {
        const enable = vi.fn().mockResolvedValue(undefined);
        const sendPayment = vi.fn().mockResolvedValue({ preimage: 'abc123' });
        (window as any).webln = { enable, sendPayment };
        mockZapSuccess();
        const { onClose } = renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(t.fetchInvoice as string));

        await waitFor(() => {
            expect(screen.getByText(t.payWithWallet as string)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(t.payWithWallet as string));

        await waitFor(() => {
            expect(enable).toHaveBeenCalledOnce();
            expect(sendPayment).toHaveBeenCalledWith(testInvoice);
            expect(onClose).toHaveBeenCalledOnce();
        });
    });
});

// ── Bitcoin On-chain ───────────────────────────────────────────────────────────
describe('ZapModal — Bitcoin on-chain', () => {
    it('não deve exibir seção Bitcoin quando perfil não tem campo bitcoin', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ lud16: testLud16 }); });

        await waitFor(() => {
            expect(screen.queryByText(new RegExp(t.bitcoinOnchain as string))).not.toBeInTheDocument();
        });
    });

    it('deve exibir seção Bitcoin quando fetchProfile retorna campo bitcoin', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        // Quando há lud16 + bitcoin, as abas aparecem — é preciso clicar na aba Bitcoin
        act(() => { profileCallback({ lud16: testLud16, bitcoin: testBitcoinAddr }); });

        await waitFor(() => {
            expect(screen.getByText(new RegExp('Bitcoin', 'i'))).toBeInTheDocument();
        });

        // Clicar na aba Bitcoin para revelar a seção on-chain
        const tabBtc = screen.getAllByRole('button').find(b => /bitcoin/i.test(b.textContent ?? ''));
        if (tabBtc) fireEvent.click(tabBtc);

        await waitFor(() => {
            expect(screen.getByText(new RegExp(t.bitcoinOnchain as string))).toBeInTheDocument();
        });
    });

    it('deve exibir QR code com URI bitcoin: correto', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ bitcoin: testBitcoinAddr }); });

        await waitFor(() => {
            const qrcodes = screen.getAllByTestId('qrcode');
            const btcQr = qrcodes.find(el => el.getAttribute('data-value') === `bitcoin:${testBitcoinAddr}`);
            expect(btcQr).toBeDefined();
        });
    });

    it('deve exibir o endereço bitcoin em texto', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ bitcoin: testBitcoinAddr }); });

        await waitFor(() => {
            expect(screen.getByText(testBitcoinAddr)).toBeInTheDocument();
        });
    });

    it('deve copiar endereço bitcoin ao clicar no botão de cópia', async () => {
        renderZap({ lud16: undefined });
        const [[, profileCallback]] = mockFetchProfile.mock.calls;
        act(() => { profileCallback({ bitcoin: testBitcoinAddr }); });

        await waitFor(() => {
            expect(screen.getByText(testBitcoinAddr)).toBeInTheDocument();
        });

        const addrEl = screen.getByText(testBitcoinAddr);
        const copyBtn = addrEl.parentElement!.querySelector('button')!;
        await act(async () => { fireEvent.click(copyBtn); });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testBitcoinAddr);
    });
});

// ── Fechamento do modal ────────────────────────────────────────────────────────
describe('ZapModal — fechamento', () => {
    it('não deve fechar ao clicar no overlay (modal de pagamento só fecha via botão)', () => {
        const { onClose } = renderZap({ lud16: testLud16 });
        fireEvent.click(screen.getByText(/Enviar Zap/).closest('.modal-overlay')!);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('deve chamar onClose ao clicar no botão X do header', () => {
        const { onClose } = renderZap({ lud16: testLud16 });
        // Há dois botões acessíveis como "Fechar": X (header) e botão rodapé
        // O X do header é o primeiro na ordem do DOM
        const allClose = screen.getAllByRole('button', { name: t.close as string });
        fireEvent.click(allClose[0]);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('deve chamar onClose ao clicar no botão Fechar do rodapé', () => {
        const { onClose } = renderZap({ lud16: testLud16 });
        const allClose = screen.getAllByRole('button', { name: t.close as string });
        fireEvent.click(allClose[allClose.length - 1]); // botão do rodapé
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('não deve fechar ao clicar dentro do modal-box', () => {
        const { onClose } = renderZap({ lud16: testLud16 });
        const box = screen.getByText(/Enviar Zap/).closest('.modal-box')!;
        fireEvent.click(box);
        expect(onClose).not.toHaveBeenCalled();
    });
});
