import { useState } from 'react';
import QRCode from 'react-qr-code';
import type { LangCode } from '../../../i18n/translations';

interface DonateProps {
    lang: LangCode;
    onClose: () => void;
}

import { MERKA_NPUB, DONATION_LN, DONATION_BTC } from '../../../config/constants';

const AUTHOR = {
    npub: MERKA_NPUB,
    lightning: DONATION_LN,
    btc: DONATION_BTC,
};

const content: Record<LangCode | 'ar', {
    title: string; desc: string; lightningTab: string; btcTab: string; nostrTab: string;
    lightningDesc: string; btcDesc: string; nostrDesc: string;
    copy: string; copied: string; thanks: string; open: string; close: string;
}> = {
    pt: {
        title: '❤️ Apoiar o Merka', desc: 'O Merka é um projeto livre e de código aberto. Se ele te ajuda, considere fazer uma doação para continuar o desenvolvimento.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Envie sats instantaneamente via Lightning Network. Copie o endereço abaixo e use qualquer carteira Lightning.',
        btcDesc: 'Doação on-chain Bitcoin. Para quantias maiores ou sem carteira Lightning.',
        nostrDesc: 'Zap via protocolo Nostr (NIP-57). Use qualquer cliente Nostr que suporte zaps.',
        copy: 'Copiar', copied: 'Copiado!', thanks: 'Obrigado pelo apoio! 🙏', open: 'Abrir Alby', close: 'Fechar',
    },
    en: {
        title: '❤️ Support Merka', desc: 'Merka is a free and open-source project. If it helps you, consider donating to keep development going.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Send sats instantly via Lightning Network. Copy the address below and use any Lightning wallet.',
        btcDesc: 'On-chain Bitcoin donation. For larger amounts or without a Lightning wallet.',
        nostrDesc: 'Zap via Nostr protocol (NIP-57). Use any Nostr client that supports zaps.',
        copy: 'Copy', copied: 'Copied!', thanks: 'Thank you for your support! 🙏', open: 'Open Alby', close: 'Close',
    },
    es: {
        title: '❤️ Apoyar Merka', desc: 'Merka es un proyecto libre y de código abierto. Si te ayuda, considera hacer una donación.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Envía sats al instante via Lightning Network.',
        btcDesc: 'Donación on-chain Bitcoin para montos mayores.',
        nostrDesc: 'Zap con el protocolo Nostr (NIP-57).',
        copy: 'Copiar', copied: '¡Copiado!', thanks: '¡Gracias por tu apoyo! 🙏', open: 'Abrir Alby', close: 'Cerrar',
    },

    ru: {
        title: 'Support Merka', desc: 'Merka is open-source and free to run. If you find value in the app, consider supporting its development.',
        lightningTab: 'Lightning', btcTab: 'Bitcoin On-chain', nostrTab: 'Zap via Nostr',
        lightningDesc: 'Fast and cheap donations via the Lightning Network.',
        btcDesc: 'For larger donations directly on the Bitcoin blockchain.',
        nostrDesc: 'If you have a Lightning wallet linked to Nostr, you can zap directly to:',
        copy: 'Copy', copied: 'Copied!', thanks: 'Thank you for your support! ⚡', open: 'Default Wallet', close: 'Close'
    },
    fr: {
        title: 'Support Merka', desc: 'Merka is open-source and free to run. If you find value in the app, consider supporting its development.',
        lightningTab: 'Lightning', btcTab: 'Bitcoin On-chain', nostrTab: 'Zap via Nostr',
        lightningDesc: 'Fast and cheap donations via the Lightning Network.',
        btcDesc: 'For larger donations directly on the Bitcoin blockchain.',
        nostrDesc: 'If you have a Lightning wallet linked to Nostr, you can zap directly to:',
        copy: 'Copy', copied: 'Copied!', thanks: 'Thank you for your support! ⚡', open: 'Default Wallet', close: 'Close'
    },
    tr: {
        title: 'Support Merka', desc: 'Merka is open-source and free to run. If you find value in the app, consider supporting its development.',
        lightningTab: 'Lightning', btcTab: 'Bitcoin On-chain', nostrTab: 'Zap via Nostr',
        lightningDesc: 'Fast and cheap donations via the Lightning Network.',
        btcDesc: 'For larger donations directly on the Bitcoin blockchain.',
        nostrDesc: 'If you have a Lightning wallet linked to Nostr, you can zap directly to:',
        copy: 'Copy', copied: 'Copied!', thanks: 'Thank you for your support! ⚡', open: 'Default Wallet', close: 'Close'
    },
    hi: {
        title: '❤️ Merka को समर्थन करें', desc: 'Merka एक मुफ्त ओपन-सोर्स प्रोजेक्ट है। यदि यह आपकी मदद करता है, तो दान करें।',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Lightning Network के माध्यम से तत्काल sats भेजें।',
        btcDesc: 'बड़ी राशि के लिए Bitcoin on-chain दान।',
        nostrDesc: 'Nostr प्रोटोकॉल (NIP-57) के जरिए Zap।',
        copy: 'कॉपी', copied: 'कॉपी किया!', thanks: 'आपके समर्थन के लिए धन्यवाद! 🙏', open: 'Alby खोलें', close: 'बंद करें',
    },
    ja: {
        title: '❤️ Merkaを支援する', desc: 'Merkaは無料のオープンソースプロジェクトです。役に立った場合、開発を続けるために寄付をご検討ください。',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Lightning Networkで即座にsatsを送金。',
        btcDesc: 'Bitcoin on-chainでの寄付。大きな金額向け。',
        nostrDesc: 'NostrプロトコルでZap（NIP-57）。',
        copy: 'コピー', copied: 'コピー済み!', thanks: 'ご支援ありがとうございます！🙏', open: 'Albyを開く', close: '閉じる',
    },
    zh: {
        title: '❤️ 支持 Merka', desc: 'Merka 是一个免费开源项目。如果对您有帮助，请考虑捐款支持开发。',
        lightningTab: '⚡ Lightning', btcTab: '₿ 比特币', nostrTab: '🌐 Nostr Zap',
        lightningDesc: '通过 Lightning Network 即时发送 sats。',
        btcDesc: '比特币链上捐款，适合较大金额。',
        nostrDesc: '通过 Nostr 协议 Zap（NIP-57）。',
        copy: '复制', copied: '已复制！', thanks: '感谢您的支持！🙏', open: '打开 Alby', close: '关闭',
    },
    ar: {
        title: '❤️ دعم Merka', desc: 'Merka مشروع مفتوح المصدر ومجاني. إذا أفادك، فكّر في التبرع لمواصلة التطوير.',
        lightningTab: '⚡ Lightning', btcTab: '₿ بيتكوين', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'أرسل ساتوشي فوراً عبر شبكة Lightning.',
        btcDesc: 'تبرع بالبيتكوين على السلسلة (on-chain) للمبالغ الكبيرة.',
        nostrDesc: 'أرسل Zap عبر بروتوكول Nostr (NIP-57).',
        copy: 'نسخ', copied: 'تم النسخ!', thanks: 'شكراً لدعمك! 🙏', open: 'فتح Alby', close: 'إغلاق',
    },
    it: {
        title: '❤️ Supporta Merka', desc: 'Merka è un progetto open-source e gratuito. Se ti è utile, considera di donare per continuare lo sviluppo.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Invia sats istantaneamente tramite Lightning Network. Copia l\'indirizzo qui sotto e usa qualsiasi wallet Lightning.',
        btcDesc: 'Donazione on-chain Bitcoin. Per importi maggiori o senza un wallet Lightning.',
        nostrDesc: 'Zap tramite protocollo Nostr (NIP-57).',
        copy: 'Copia', copied: 'Copiato!', thanks: 'Grazie per il tuo supporto! 🙏', open: 'Apri Alby', close: 'Chiudi',
    },
    de: {
        title: '❤️ Merka unterstützen', desc: 'Merka ist ein freies Open-Source-Projekt. Wenn es Ihnen hilft, erwägen Sie eine Spende.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Senden Sie sats sofort über das Lightning Network.',
        btcDesc: 'Bitcoin On-Chain-Spende. Für größere Beträge.',
        nostrDesc: 'Zap über das Nostr-Protokoll (NIP-57).',
        copy: 'Kopieren', copied: 'Kopiert!', thanks: 'Danke für Ihre Unterstützung! 🙏', open: 'Alby öffnen', close: 'Schließen',
    },
    fa: {
        title: '❤️ حمایت از Merka', desc: 'پروژه منبع باز و رایگان.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'ارسال فوری sats.', btcDesc: 'بیت‌کوین', nostrDesc: 'نوستر', copy: 'کپی', copied: 'کپی شد!', thanks: 'ممنون!', open: 'باز کردن', close: 'بستن',
    },
    vi: {
        title: '❤️ Ủng hộ Merka', desc: 'Dự án mã nguồn mở miễn phí.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Gửi sats ngay lập tức.', btcDesc: 'Bitcoin', nostrDesc: 'Nostr', copy: 'Sao chép', copied: 'Đã sao chép!', thanks: 'Cảm ơn!', open: 'Mở', close: 'Đóng',
    },
    uk: {
        title: '❤️ Підтримати Merka', desc: 'Відкритий проект.',
        lightningTab: '⚡ Lightning', btcTab: '₿ Bitcoin', nostrTab: '🌐 Nostr Zap',
        lightningDesc: 'Відправити sats.', btcDesc: 'Bitcoin', nostrDesc: 'Nostr', copy: 'Копіювати', copied: 'Скопійовано!', thanks: 'Дякуємо!', open: 'Відкрити', close: 'Закрити',
    },
};

type DonateTab = 'lightning' | 'btc' | 'nostr';

export function DonateModal({ lang, onClose }: DonateProps) {
    const c = content[lang as keyof typeof content] || content.en;
    const [tab, setTab] = useState<DonateTab>('lightning');
    const [copied, setCopied] = useState('');

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(''), 2500);
    };

    const tabValue = { lightning: AUTHOR.lightning, btc: AUTHOR.btc, nostr: AUTHOR.npub }[tab];
    const tabDesc = { lightning: c.lightningDesc, btc: c.btcDesc, nostr: c.nostrDesc }[tab];

    const qrInfo: Record<DonateTab, string> = {
        lightning: 'lightning:' + AUTHOR.lightning,
        btc: 'bitcoin:' + AUTHOR.btc,
        nostr: 'nostr:' + AUTHOR.npub,
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box donate-modal-box" onClick={e => e.stopPropagation()}>
                {/* Header — fixo, não rola */}
                <div className="donate-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem' }}>{c.title}</h2>
                        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{c.desc}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem', flexShrink: 0 }}>✕</button>
                </div>

                {/* Conteúdo rolável */}
                <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0 }}>
                  {/* Tabs */}
                  <div className="donate-tabs">
                      {(['lightning', 'btc', 'nostr'] as DonateTab[]).map(t => (
                          <button key={t} className={`donate-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                              {{ lightning: c.lightningTab, btc: c.btcTab, nostr: c.nostrTab }[t]}
                          </button>
                      ))}
                  </div>

                  {/* Content */}
                  <div className="donate-content">
                      {/* Real QR Code */}
                      <div className="donate-qr-area" title={qrInfo[tab]} style={{ padding: '0.8rem', background: '#fff', borderRadius: '12px', display: 'inline-block', margin: '0 auto 1rem' }}>
                          <QRCode
                              value={qrInfo[tab]}
                              size={160}
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                              viewBox={`0 0 160 160`}
                          />
                      </div>

                      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tabDesc}</p>

                      <div className="donate-address-row">
                          <code className="donate-address">{tabValue}</code>
                          <button className="btn-icon" onClick={() => copy(tabValue, tab)} style={{ flexShrink: 0 }}>
                              {copied === tab
                                  ? <span style={{ fontSize: '.65rem', color: 'var(--success)' }}>{c.copied}</span>
                                  : <span>📋</span>
                              }
                          </button>
                      </div>
                  </div>

                  {copied && <div style={{ textAlign: 'center', color: 'var(--success)', fontSize: '.82rem', fontWeight: 600 }}>{c.thanks}</div>}
                </div>

                {/* Footer — fixo, não rola */}
                <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', marginTop: '1rem', flexShrink: 0 }}>
                    {c.close}
                </button>
            </div>
        </div>
    );
}
