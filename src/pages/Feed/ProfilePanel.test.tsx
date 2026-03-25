/**
 * Testes de comportamento do ProfilePanel.
 * Cobre: renderização inicial, edição de perfil, fluxo de logout com confirmação,
 * exibição do link Primal, cópia de chaves, e integração com useDragToClose.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { ProfilePanel } from './ProfilePanel';
import type { Translations } from '../../i18n/translations';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockFetchProfile = vi.hoisted(() => vi.fn((_pk: string, _cb: any) => {}));
const mockPublishProfile = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('../../services/nostr/nostr', () => ({
  fetchProfile: mockFetchProfile,
  publishProfile: mockPublishProfile,
  fetchReputation: vi.fn(() => Promise.resolve({
    followers: 0, following: 0, nip05: false, lud16: false,
    zapCount: 0, reactionCount: 0, tier: 'new', fetchedAt: Date.now(),
  })),
}));

// useDragToClose returns event handlers; mock it to be a no-op
vi.mock('../../hooks/useDragToClose', () => ({
  useDragToClose: vi.fn(() => ({})),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sk = generateSecretKey();
const pk = getPublicKey(sk);
const npub = nip19.npubEncode(pk);
const nsec = 'nsec1test123456789abcdeftest';
const keys = { sk, pk, nsec, npub };

const t = {
  profile: 'Perfil',
  editProfile: 'Editar perfil',
  saveProfile: 'Salvar perfil',
  cancel: 'Cancelar',
  copied: 'Copiado!',
  openInApp: 'Abrir no app',
  logout: 'Deslogar',
  logoutConfirmMsg: 'Todos os dados locais serão apagados, incluindo sua chave privada.',
  logoutConfirmBtn: 'Sim, deslogar',
  confirm: 'Confirmar',
  secKey: 'Chave privada',
  keepPrivate: 'Nunca compartilhe',
  username: 'Nome de usuário',
  displayName: 'Nome de exibição',
  lightningAddress: 'Lightning',
  bitcoinAddress: 'Bitcoin',
  website: 'Site',
  nip05: 'NIP-05',
  bio: 'Bio',
  bioPlaceholder: 'Sobre você...',
  helpLud16: 'Ajuda LN',
  helpBitcoin: 'Ajuda BTC',
  helpWebsite: 'Ajuda site',
  helpNip05: 'Ajuda NIP-05',
  profileUpdated: 'Perfil atualizado!',
} as unknown as Translations;

function renderPanel(overrides?: { onLogout?: (() => void) | null; onClose?: () => void }) {
  const onClose = overrides?.onClose ?? vi.fn();
  const onUpdate = vi.fn();
  const onToast = vi.fn();
  const onLogout = overrides?.onLogout !== undefined ? overrides.onLogout ?? undefined : vi.fn();

  const result = render(
    <ProfilePanel
      t={t}
      keys={keys}
      onClose={onClose}
      onUpdate={onUpdate}
      onToast={onToast}
      onLogout={onLogout ?? undefined}
    />,
  );

  return { ...result, onClose, onUpdate, onToast, onLogout };
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => cb({}));
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

// ── Renderização básica ────────────────────────────────────────────────────────
describe('ProfilePanel — renderização inicial', () => {
  it('deve renderizar sem erros com props mínimas', () => {
    renderPanel({ onLogout: null });
    expect(screen.getByRole('button', { name: /Editar perfil/i })).toBeInTheDocument();
  });

  it('deve exibir o link Primal na barra superior', () => {
    renderPanel();
    const primalLink = screen.getByRole('link', { name: /Primal/i });
    expect(primalLink).toBeInTheDocument();
    expect(primalLink).toHaveAttribute('href', `https://primal.net/p/${npub}`);
    expect(primalLink).toHaveAttribute('target', '_blank');
  });

  it('deve exibir os 2 últimos caracteres do npub no avatar', () => {
    renderPanel();
    const avatarText = npub.slice(-2).toUpperCase();
    expect(screen.getByText(avatarText)).toBeInTheDocument();
  });

  it('deve exibir chave privada parcialmente oculta', () => {
    renderPanel();
    expect(screen.getByText(/nsec1test/)).toBeInTheDocument();
    expect(screen.getByText(/•••/)).toBeInTheDocument();
  });

  it('deve exibir aviso de manter chave privada', () => {
    renderPanel();
    expect(screen.getByText(/Nunca compartilhe/i)).toBeInTheDocument();
  });

  it('deve chamar fetchProfile com o pk correto ao montar', () => {
    renderPanel();
    expect(mockFetchProfile).toHaveBeenCalledWith(pk, expect.any(Function));
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
describe('ProfilePanel — botão de logout', () => {
  it('deve exibir botão Deslogar quando onLogout é fornecido', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Deslogar/i })).toBeInTheDocument();
  });

  it('não deve exibir botão Deslogar quando onLogout não é fornecido', () => {
    renderPanel({ onLogout: null });
    expect(screen.queryByRole('button', { name: /Deslogar/i })).not.toBeInTheDocument();
  });

  it('deve exibir popup de confirmação ao clicar em Deslogar', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Deslogar/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sim, deslogar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });
  });

  it('deve chamar onLogout ao confirmar no popup', async () => {
    const { onLogout } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Deslogar/i }));
    await waitFor(() => screen.getByRole('button', { name: /Sim, deslogar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sim, deslogar/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('não deve chamar onLogout ao cancelar no popup', async () => {
    const { onLogout } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Deslogar/i }));
    await waitFor(() => screen.getByRole('button', { name: /Cancelar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('deve fechar o popup ao cancelar (popup some)', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Deslogar/i }));
    await waitFor(() => screen.getByRole('button', { name: /Sim, deslogar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Sim, deslogar/i })).not.toBeInTheDocument();
    });
  });
});

// ── Edição de perfil ──────────────────────────────────────────────────────────
describe('ProfilePanel — edição de perfil', () => {
  beforeEach(() => {
    mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
      cb({ name: 'alice', display_name: 'Alice Satoshi', about: 'Bio teste' });
    });
  });

  it('deve ativar modo de edição ao clicar em Editar perfil', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Salvar perfil/i })).toBeInTheDocument();
    });
  });

  it('deve exibir botão Cancelar no modo de edição', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });
  });

  it('deve voltar ao modo de visualização ao cancelar edição', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => screen.getByRole('button', { name: /Cancelar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar perfil/i })).toBeInTheDocument();
    });
  });

  it('deve chamar publishProfile ao salvar', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => screen.getByRole('button', { name: /Salvar perfil/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar perfil/i }));
    });
    expect(mockPublishProfile).toHaveBeenCalledWith(sk, expect.any(Object));
  });

  it('deve chamar onToast com profileUpdated após salvar', async () => {
    const { onToast } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => screen.getByRole('button', { name: /Salvar perfil/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar perfil/i }));
    });
    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith(t.profileUpdated);
    });
  });
});

// ── Cópia de chaves ────────────────────────────────────────────────────────────
describe('ProfilePanel — cópia de chaves', () => {
  it('deve copiar nsec ao clicar no botão de cópia da chave privada', async () => {
    renderPanel();
    // The nsec copy button is the one near the nsec display
    const nsecContainer = screen.getByText(/nsec1test/).closest('.nsec-row')!;
    const copyBtn = nsecContainer.querySelector('button')!;
    await act(async () => { fireEvent.click(copyBtn); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(nsec);
  });

  it('deve copiar npub ao clicar no botão de cópia da chave pública', async () => {
    renderPanel();
    const npubChip = screen.getByText(new RegExp(npub.slice(0, 12))).closest('div')!;
    const copyBtn = npubChip.parentElement!.querySelector('button')!;
    await act(async () => { fireEvent.click(copyBtn); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(npub);
  });
});

// ── Fechamento ────────────────────────────────────────────────────────────────
describe('ProfilePanel — fechamento', () => {
  it('deve chamar onClose ao clicar no botão X no header do perfil', () => {
    const { onClose } = renderPanel();
    // The header has 2 btn-icon buttons: copy-npub and X. The X is the last one.
    const allBtns = Array.from(document.querySelectorAll('.profile-modal-header button.btn-icon')) as HTMLButtonElement[];
    const xBtn = allBtns[allBtns.length - 1];
    expect(xBtn).not.toBeNull();
    fireEvent.click(xBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('deve chamar onClose ao clicar no overlay quando não está editando', () => {
    const { onClose } = renderPanel();
    const overlay = document.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não deve chamar onClose ao clicar no overlay durante edição', async () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));
    await waitFor(() => screen.getByRole('button', { name: /Salvar perfil/i }));
    const overlay = document.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Profile nome no header ────────────────────────────────────────────────────
describe('ProfilePanel — nome no header', () => {
  it('deve exibir display_name no título do header quando disponível', async () => {
    mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
      cb({ display_name: 'Satoshi Nakamoto' });
    });
    renderPanel();
    await waitFor(() => {
      // The h3 in profile-modal-header should show the display_name
      const h3 = document.querySelector('.profile-modal-header h3')!;
      expect(h3.textContent).toBe('Satoshi Nakamoto');
    });
  });

  it('deve fazer fallback para name no título quando display_name não existe', async () => {
    mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
      cb({ name: 'satoshi' });
    });
    renderPanel();
    await waitFor(() => {
      const h3 = document.querySelector('.profile-modal-header h3')!;
      expect(h3.textContent).toBe('satoshi');
    });
  });

  it('deve exibir "Anonymous" quando perfil não tem nome', async () => {
    mockFetchProfile.mockImplementation((_pk: string, cb: (p: any) => void) => {
      cb({});
    });
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });
  });
});
