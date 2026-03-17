/**
 * Testes de comportamento de RelaySettingsModal.
 * Cobre: add relay, remove relay, validação de URL, restore defaults,
 * lifecycle de subscriptions, status de conexão e UI condicional.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelaySettingsModal } from './RelaySettingsModal';
import type { Translations } from '../../../i18n/translations';
import { translations } from '../../../i18n/translations';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSubscribeRelayStatus = vi.hoisted(() => vi.fn((_cb: any) => vi.fn()));
const mockUpdateRelays = vi.hoisted(() => vi.fn((_relays: any[]) => {}));
const mockPublishNip65Relays = vi.hoisted(() => vi.fn((_sk: Uint8Array, _relays: any[]) => Promise.resolve()));
// Mutable array — mutations visible inside the component via same reference
const mockRelayConfigs = vi.hoisted(() => [] as Array<{ url: string; name: string }>);

vi.mock('../../../services/nostr/nostr', () => ({
    RELAY_CONFIGS: mockRelayConfigs,
    DEFAULT_RELAYS: [
        { url: 'wss://default1.com', name: 'default1.com' },
        { url: 'wss://default2.com', name: 'default2.com' },
    ],
    subscribeRelayStatus: mockSubscribeRelayStatus,
    updateRelays: mockUpdateRelays,
    publishNip65Relays: mockPublishNip65Relays,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const t = translations.en as Translations;

const tOverride: Translations = {
    ...t,
    relaySettings: '🌐 Relay Settings',
    relaySettingsDesc: 'Manage relays',
    addRelay: 'wss://...',
    add: 'Add',
    restoreDefaults: 'Restore Defaults',
    confirmDelete: 'Are you sure?',
    cancel: 'Cancel',
    invalidRelayUrl: 'Must start with wss://',
    minRelaysWarning: 'Keep at least two relays',
    confirmRestoreDefaults: 'This will override your current list.',
    clearHistoryIndiv: 'Remove',
    relayStatus: { connecting: 'Connecting...', connected: 'Connected', offline: 'Offline', error: 'Error' },
} as Translations;

function makeRelays(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        url: `wss://relay${i + 1}.com`,
        name: `relay${i + 1}.com`,
        status: 'connected',
    }));
}

function setup(props: Partial<Parameters<typeof RelaySettingsModal>[0]> = {}) {
    const onClose = vi.fn();
    const result = render(
        <RelaySettingsModal
            t={tOverride}
            onClose={onClose}
            {...props}
        />
    );
    return { onClose, ...result };
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
describe('RelaySettingsModal — lifecycle', () => {
    beforeEach(() => {
        mockSubscribeRelayStatus.mockClear();
        mockUpdateRelays.mockClear();
        mockPublishNip65Relays.mockClear();
    });

    it('deve chamar subscribeRelayStatus ao montar', () => {
        setup();
        expect(mockSubscribeRelayStatus).toHaveBeenCalledTimes(1);
    });

    it('deve chamar o cleanup de subscribeRelayStatus ao desmontar', () => {
        const mockUnsub = vi.fn();
        mockSubscribeRelayStatus.mockReturnValueOnce(mockUnsub);
        const { unmount } = setup();
        unmount();
        expect(mockUnsub).toHaveBeenCalledTimes(1);
    });
});

// ── Fechar modal ──────────────────────────────────────────────────────────────
describe('RelaySettingsModal — fechar', () => {
    it('deve chamar onClose ao clicar no botão fechar', () => {
        const { onClose } = setup();
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('não deve fechar ao clicar no overlay (modal de configuração protegido de fechamento acidental)', () => {
        const { onClose } = setup();
        const overlay = document.querySelector('.modal-overlay')!;
        fireEvent.click(overlay);
        expect(onClose).not.toHaveBeenCalled();
    });
});

// ── Renderização da lista de relays ───────────────────────────────────────────
describe('RelaySettingsModal — lista de relays', () => {
    it('deve exibir os relays fornecidos por subscribeRelayStatus', () => {
        const relays = makeRelays(3);
        mockSubscribeRelayStatus.mockImplementation((cb: (rs: typeof relays) => void) => {
            cb(relays);
            return vi.fn();
        });

        setup();
        expect(screen.getByText('relay1.com')).toBeInTheDocument();
        expect(screen.getByText('relay2.com')).toBeInTheDocument();
        expect(screen.getByText('relay3.com')).toBeInTheDocument();
    });

    it('deve desabilitar o botão remover quando há apenas 1 relay', () => {
        const relays = makeRelays(1);
        mockSubscribeRelayStatus.mockImplementation((cb: (rs: typeof relays) => void) => {
            cb(relays);
            return vi.fn();
        });

        setup();
        const removeBtn = screen.getByTitle('Remove');
        expect(removeBtn).toBeDisabled();
    });

    it('deve habilitar o botão remover quando há 2+ relays', () => {
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: (rs: typeof relays) => void) => {
            cb(relays);
            return vi.fn();
        });

        setup();
        const removeBtns = screen.getAllByTitle('Remove');
        removeBtns.forEach(btn => expect(btn).not.toBeDisabled());
    });

    it('deve exibir aviso de minRelaysWarning quando relays.length <= 2', () => {
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: (rs: typeof relays) => void) => {
            cb(relays);
            return vi.fn();
        });

        setup();
        expect(screen.getByText('Keep at least two relays')).toBeInTheDocument();
    });

    it('não deve exibir aviso quando relays.length > 2', () => {
        const relays = makeRelays(3);
        mockSubscribeRelayStatus.mockImplementation((cb: (rs: typeof relays) => void) => {
            cb(relays);
            return vi.fn();
        });

        setup();
        expect(screen.queryByText('Keep at least two relays')).not.toBeInTheDocument();
    });
});

// ── Status dos relays ─────────────────────────────────────────────────────────
describe('RelaySettingsModal — status dos relays', () => {
    it('deve exibir texto de status "Connected" para relay conectado', () => {
        const relays = [{ url: 'wss://relay1.com', name: 'relay1.com', status: 'connected' }];
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();
        expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('deve exibir texto de status "Connecting..." para relay conectando', () => {
        const relays = [{ url: 'wss://relay1.com', name: 'relay1.com', status: 'connecting' }];
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('deve exibir texto de status "Offline" para relay offline', () => {
        const relays = [{ url: 'wss://relay1.com', name: 'relay1.com', status: 'offline' }];
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();
        expect(screen.getByText('Offline')).toBeInTheDocument();
    });
});

// ── Adicionar relay ───────────────────────────────────────────────────────────
describe('RelaySettingsModal — adicionar relay', () => {
    beforeEach(() => {
        mockRelayConfigs.splice(0);
        mockUpdateRelays.mockClear();
        mockPublishNip65Relays.mockClear();
        mockSubscribeRelayStatus.mockReturnValue(vi.fn());
    });

    it('não deve chamar updateRelays com URL vazia', () => {
        setup();
        const addBtn = screen.getByText('Add');
        fireEvent.click(addBtn);
        expect(mockUpdateRelays).not.toHaveBeenCalled();
    });

    it('deve mostrar erro para URL sem prefixo wss:// ou ws://', () => {
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'http://invalid.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect(screen.getByText('Must start with wss://')).toBeInTheDocument();
        expect(mockUpdateRelays).not.toHaveBeenCalled();
    });

    it('deve aceitar URL wss:// válida e chamar updateRelays', () => {
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'wss://newrelay.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect(mockUpdateRelays).toHaveBeenCalledTimes(1);
        expect(mockUpdateRelays).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ url: 'wss://newrelay.com' })])
        );
    });

    it('[segurança] deve aceitar URL ws:// (WS não criptografado é permitido na UI)', () => {
        // Documentação: a UI aceita ws://, ao contrário de fetchNip65Relays que bloqueia ws://
        // Este é um comportamento existente, testado aqui como documentação de comportamento.
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'ws://insecure.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect(mockUpdateRelays).toHaveBeenCalledTimes(1);
    });

    it('não deve chamar publishNip65Relays se keys.sk não está definido', () => {
        setup({ keys: undefined });
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'wss://newrelay.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect(mockPublishNip65Relays).not.toHaveBeenCalled();
    });

    it('deve chamar publishNip65Relays se keys.sk está presente', () => {
        const sk = new Uint8Array(32).fill(1);
        setup({ keys: { sk, pk: 'fakepk' } });
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'wss://newrelay.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect(mockPublishNip65Relays).toHaveBeenCalledTimes(1);
        expect(mockPublishNip65Relays).toHaveBeenCalledWith(sk, expect.any(Array));
    });

    it('deve limpar o input após adicionar relay com sucesso', () => {
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'wss://newrelay.com' } });
        fireEvent.click(screen.getByText('Add'));
        expect((input as HTMLInputElement).value).toBe('');
    });

    it('deve limpar o erro ao digitar novamente', () => {
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'invalid' } });
        fireEvent.click(screen.getByText('Add'));
        expect(screen.getByText('Must start with wss://')).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'wss://fixed.com' } });
        expect(screen.queryByText('Must start with wss://')).not.toBeInTheDocument();
    });

    it('deve ignorar URL duplicada já existente em RELAY_CONFIGS', () => {
        mockRelayConfigs.push({ url: 'wss://existing.com', name: 'existing.com' });
        setup();
        const input = screen.getByPlaceholderText('wss://...');
        fireEvent.change(input, { target: { value: 'wss://existing.com' } });
        fireEvent.click(screen.getByText('Add'));
        // limpa input mas não chama updateRelays
        expect((input as HTMLInputElement).value).toBe('');
        expect(mockUpdateRelays).not.toHaveBeenCalled();
    });

    it('o botão Add deve estar desabilitado quando input está vazio', () => {
        setup();
        const addBtn = screen.getByText('Add');
        expect(addBtn).toBeDisabled();
    });
});

// ── Remover relay ─────────────────────────────────────────────────────────────
describe('RelaySettingsModal — remover relay', () => {
    beforeEach(() => {
        mockRelayConfigs.splice(0);
        mockUpdateRelays.mockClear();
        mockPublishNip65Relays.mockClear();
    });

    it('deve exibir confirmação ao clicar em remover (não remove direto)', () => {
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();

        const removeBtns = screen.getAllByTitle('Remove');
        fireEvent.click(removeBtns[0]);

        // Confirmação inline deve aparecer — updateRelays ainda NÃO foi chamado
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(mockUpdateRelays).not.toHaveBeenCalled();
    });

    it('deve chamar updateRelays ao confirmar remoção do relay', () => {
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();

        const removeBtns = screen.getAllByTitle('Remove');
        fireEvent.click(removeBtns[0]);

        // Confirmar com o botão ✓
        const confirmBtn = screen.getByText('✓');
        fireEvent.click(confirmBtn);
        expect(mockUpdateRelays).toHaveBeenCalledTimes(1);
    });

    it('deve chamar publishNip65Relays ao confirmar remoção se keys.sk presente', () => {
        const sk = new Uint8Array(32).fill(2);
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup({ keys: { sk, pk: 'fakepk' } });

        const removeBtns = screen.getAllByTitle('Remove');
        fireEvent.click(removeBtns[0]);

        const confirmBtn = screen.getByText('✓');
        fireEvent.click(confirmBtn);
        expect(mockPublishNip65Relays).toHaveBeenCalledWith(sk, expect.any(Array));
    });

    it('deve cancelar a remoção e não chamar updateRelays ao clicar em Cancel', () => {
        const relays = makeRelays(2);
        mockSubscribeRelayStatus.mockImplementation((cb: any) => { cb(relays); return vi.fn(); });
        setup();

        const removeBtns = screen.getAllByTitle('Remove');
        fireEvent.click(removeBtns[0]);

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockUpdateRelays).not.toHaveBeenCalled();
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });
});

// ── Restore defaults ──────────────────────────────────────────────────────────
describe('RelaySettingsModal — restore defaults', () => {
    beforeEach(() => {
        mockRelayConfigs.splice(0);
        mockUpdateRelays.mockClear();
        mockPublishNip65Relays.mockClear();
        mockSubscribeRelayStatus.mockReturnValue(vi.fn());
    });

    it('primeiro clique em Restore Defaults deve mostrar confirmação', () => {
        setup();
        fireEvent.click(screen.getByText('Restore Defaults'));
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('This will override your current list.')).toBeInTheDocument();
    });

    it('segundo clique (confirmação) deve chamar updateRelays com DEFAULT_RELAYS', () => {
        setup();
        fireEvent.click(screen.getByText('Restore Defaults'));
        fireEvent.click(screen.getByText('Are you sure?'));
        expect(mockUpdateRelays).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ url: 'wss://default1.com' }),
                expect.objectContaining({ url: 'wss://default2.com' }),
            ])
        );
    });

    it('segundo clique (confirmação) deve chamar publishNip65Relays se keys.sk presente', () => {
        const sk = new Uint8Array(32).fill(3);
        setup({ keys: { sk, pk: 'fakepk' } });
        fireEvent.click(screen.getByText('Restore Defaults'));
        fireEvent.click(screen.getByText('Are you sure?'));
        expect(mockPublishNip65Relays).toHaveBeenCalledWith(sk, expect.any(Array));
    });

    it('após confirmar restore, confirmação deve sumir', () => {
        setup();
        fireEvent.click(screen.getByText('Restore Defaults'));
        fireEvent.click(screen.getByText('Are you sure?'));
        expect(screen.queryByText('This will override your current list.')).not.toBeInTheDocument();
    });

    it('botão Cancel deve cancelar o restore e sumir a confirmação', () => {
        setup();
        fireEvent.click(screen.getByText('Restore Defaults'));
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
        expect(mockUpdateRelays).not.toHaveBeenCalled();
    });
});
