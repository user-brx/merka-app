import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Translations } from '../../i18n/translations';
import { CopyIcon, ZapIcon } from '../../components/ui/icons';
import { getLnurlEndpoint, fetchLnurlPayMetadata, createZapRequest, fetchZapInvoice } from '../../services/nostr/zap';
import { fetchProfile } from '../../services/nostr/nostr';

declare global {
  interface Window {
    webln?: {
      enable: () => Promise<void>;
      sendPayment: (pr: string) => Promise<{ preimage: string }>;
    };
  }
}

export interface ZapModalProps {
  t: Translations;
  targetNpub: string;
  targetPubkey: string;
  noteId?: string;
  lud16?: string;
  myKeys: { sk: Uint8Array; pk: string } | null;
  onClose: () => void;
}

export function ZapModal({ t, targetNpub, targetPubkey, noteId, lud16: propLud16, myKeys, onClose }: ZapModalProps) {
  const [copied, setCopied] = useState(false);
  const [lud16, setLud16] = useState<string | undefined>(propLud16);
  const [bitcoinAddr, setBitcoinAddr] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'lightning' | 'bitcoin'>('lightning');

  useEffect(() => {
    fetchProfile(targetPubkey, p => {
      if (!lud16 && p.lud16) setLud16(p.lud16);
      if (p.bitcoin) setBitcoinAddr(p.bitcoin);
    });
  }, [targetPubkey]);

  // LNURL State
  const [amount, setAmount] = useState<number>(21);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState('');

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateZap = async () => {
    if (!lud16 || !myKeys) return;
    setIsLoading(true);
    setErrorDetails('');
    try {
      const endpoint = await getLnurlEndpoint(lud16);
      if (!endpoint) throw new Error('Invalid Lightning Address');

      const meta = await fetchLnurlPayMetadata(endpoint);
      if (!meta.callback) throw new Error('Lightning Provider did not respond');

      const msats = amount * 1000;
      if (meta.minSendable && msats < meta.minSendable) throw new Error(`Min amount is ${meta.minSendable / 1000} sats`);
      if (meta.maxSendable && msats > meta.maxSendable) throw new Error(`Max amount is ${meta.maxSendable / 1000} sats`);

      const zapRequest = createZapRequest(myKeys.sk, targetPubkey, noteId, amount, comment);
      const pr = await fetchZapInvoice(meta.callback, msats, zapRequest);
      setInvoice(pr);
    } catch (err: unknown) {
      setErrorDetails(err instanceof Error ? err.message : 'Payment error');
    } finally {
      setIsLoading(false);
    }
  };

  const payWithWebLN = async () => {
    if (!invoice) return;
    try {
      if (typeof window.webln !== 'undefined') {
        await window.webln.enable();
        await window.webln.sendPayment(invoice);
        onClose();
      } else {
        alert('WebLN not found. Please install a Lightning wallet extension like Alby.');
      }
    } catch (err) {
      console.error('WebLN error', err);
    }
  };

  const hasBoth = !!lud16 && !!bitcoinAddr;

  return (
    // Sem onClick no overlay — modal de pagamento só fecha via botão
    <div className="modal-overlay">
      <div className="modal-box zap-modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
          <h3 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '.5rem', margin: 0 }}>
            <ZapIcon /> {t.zapTitle}
          </h3>
          <button className="btn-icon" onClick={onClose} aria-label={t.close} style={{ padding: '.4rem .7rem', flexShrink: 0 }}>✕</button>
        </div>

        {/* Tabs — só exibe quando usuário tem lud16 e bitcoin */}
        {hasBoth && (
          <div className="zap-tabs">
            <button
              className={`zap-tab-btn${activeTab === 'lightning' ? ' active' : ''}`}
              onClick={() => setActiveTab('lightning')}
            >
              ⚡ {t.zapTabLightning || 'Lightning'}
            </button>
            <button
              className={`zap-tab-btn${activeTab === 'bitcoin' ? ' active' : ''}`}
              onClick={() => setActiveTab('bitcoin')}
            >
              ₿ {t.zapTabBitcoin || 'Bitcoin'}
            </button>
          </div>
        )}

        {/* Lightning tab (ou único painel se não houver bitcoin) */}
        {(!hasBoth || activeTab === 'lightning') && (
          <>
            {lud16 ? (
              <div className="zap-dynamic-area" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.scanToPay || 'Read QR Code with Wallet:'}</span>
                  <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
                    <QRCodeSVG value={`lightning:${lud16}`} size={140} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>{lud16}</code>
                    <button onClick={() => copy(lud16)} className="btn-icon" style={{ padding: '0.2rem' }}>
                      {copied ? '✓' : <CopyIcon />}
                    </button>
                  </div>
                </div>

                {myKeys ? (
                  !invoice ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
                        <label style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{t.zapAmount || 'Amount (sats)'}</label>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          {[21, 100, 1000, 5000].map(val => (
                            <button
                              key={val}
                              onClick={() => setAmount(val)}
                              style={{
                                flex: 1, padding: '.4rem', background: amount === val ? 'var(--warning)' : 'var(--bg-card)',
                                color: amount === val ? '#000' : 'var(--text-main)',
                                border: '1px solid var(--warning)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(Number(e.target.value))}
                          min={1}
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '.6rem', borderRadius: '8px', color: '#fff', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }}
                        />
                        <input
                          type="text"
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder={t.zapComment || 'Comment (optional)'}
                          maxLength={100}
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '.6rem', borderRadius: '8px', color: '#fff', fontSize: '.9rem', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      {errorDetails && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginBottom: '.5rem' }}>{errorDetails}</div>}
                      <button
                        onClick={handleCreateZap}
                        disabled={isLoading}
                        style={{ background: 'var(--warning)', color: '#000', width: '100%', padding: '.8rem', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        {isLoading ? '⏳...' : <>{t.fetchInvoice || 'Get Invoice'} <ZapIcon /></>}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: '#fff', padding: '.5rem', borderRadius: '8px' }}>
                        <QRCodeSVG value={`lightning:${invoice}`} size={200} />
                      </div>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', wordBreak: 'break-all', opacity: 0.6, background: 'rgba(0,0,0,0.5)', padding: '.5rem', borderRadius: '4px' }}>
                        {invoice.slice(0, 30)}...{invoice.slice(-15)}
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem', width: '100%' }}>
                        <button onClick={() => copy(invoice)} style={{ flex: 1, background: 'var(--bg-card)', padding: '.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}>
                          {copied ? '✓' : `📄 ${t.copyInvoice || 'Copy Invoice'}`}
                        </button>
                        {typeof window.webln !== 'undefined' && (
                          <button onClick={payWithWebLN} style={{ flex: 1, background: 'var(--warning)', color: '#000', padding: '.6rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <ZapIcon /> {t.payWithWallet || 'Pay with Wallet'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {t.loginToZapDirectly || 'Log in to zap instantly from Merka.'}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{t.zapInfo}</p>
                <div className="zap-info" style={{ marginTop: '1rem' }}>
                  <strong style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t.zapPubkey}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.3rem' }}>
                    <code style={{ fontSize: '.78rem', wordBreak: 'break-all', flex: 1, color: 'var(--warning)' }}>{targetNpub}</code>
                    <button onClick={() => copy(targetNpub)} className="btn-icon" style={{ flexShrink: 0 }}>
                      {copied ? '✓' : <CopyIcon />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Bitcoin tab (ou único painel se não houver lud16) */}
        {(!hasBoth || activeTab === 'bitcoin') && bitcoinAddr && (
          <div style={{ marginTop: hasBoth ? 0 : '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f7931a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ₿ {t.bitcoinOnchain}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.bitcoinScanToPay}</span>
            <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
              <QRCodeSVG value={`bitcoin:${bitcoinAddr}`} size={140} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.78rem', color: '#f7931a', wordBreak: 'break-all' }}>{bitcoinAddr}</code>
              <button onClick={() => copy(bitcoinAddr)} className="btn-icon" style={{ padding: '0.2rem', flexShrink: 0 }}>
                {copied ? '✓' : <CopyIcon />}
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '100%' }}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}
