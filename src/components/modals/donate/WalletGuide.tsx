import type { LangCode } from '../../../i18n/translations';
import { useDragToClose } from '../../../hooks/useDragToClose';
import { XIcon, BitcoinIcon } from '../../ui/icons';

// ── Wallet data ──────────────────────────────────────────────────────────────
const wallets = [
    {
        name: 'Wallet of Satoshi',
        url: 'https://www.walletofsatoshi.com',
        icon: '🟡',
        tag: 'iOS · Android',
        level: 'beginner',
    },
    {
        name: 'Alby',
        url: 'https://getalby.com',
        icon: '🐝',
        tag: 'Browser · Web',
        level: 'nostr',
    },
    {
        name: 'Phoenix',
        url: 'https://phoenixwallet.io',
        icon: '🔥',
        tag: 'iOS · Android',
        level: 'intermediate',
    },
    {
        name: 'Muun',
        url: 'https://muun.com',
        icon: '🌙',
        tag: 'iOS · Android',
        level: 'beginner',
    },
    {
        name: 'Blue Wallet',
        url: 'https://bluewallet.io',
        icon: '🔵',
        tag: 'iOS · Android',
        level: 'intermediate',
    },
    {
        name: 'Breez',
        url: 'https://breez.technology',
        icon: '🌬️',
        tag: 'iOS · Android',
        level: 'intermediate',
    },
    {
        name: 'Zeus',
        url: 'https://zeusln.app',
        icon: '⚡',
        tag: 'iOS · Android',
        level: 'advanced',
    },
];

// ── Content per language ──────────────────────────────────────────────────────
const content: Partial<Record<LangCode, {
    title: string; tagline: string;
    bitcoinTitle: string; bitcoin: string;
    lightningTitle: string; lightning: string;
    whyTitle: string; why: string;
    walletsTitle: string;
    beginnerLabel: string; nostrLabel: string; intermediateLabel: string; advancedLabel: string;
    openWallet: string; close: string;
}>> = {
    pt: {
        title: 'Bitcoin & Lightning',
        tagline: 'O dinheiro digital da internet — rápido, global e sem intermediários.',
        bitcoinTitle: '₿ O que é Bitcoin?',
        bitcoin: 'Bitcoin é uma moeda digital descentralizada criada em 2009. Não é controlada por nenhum governo, banco ou empresa. Você é o único dono do seu dinheiro — sem fronteiras, sem bloqueios, sem inflação artificial. Funciona 24h por dia, 7 dias por semana, em qualquer país do mundo.',
        lightningTitle: '⚡ O que é a Lightning Network?',
        lightning: 'Lightning é uma camada de pagamentos construída sobre o Bitcoin. Ela permite transações instantâneas com taxas quase zero — ideal para pagamentos do dia a dia. No Merka, você pode usar o endereço Lightning (como um e-mail para dinheiro, ex: voce@walletofsatoshi.com) para receber pagamentos de compradores diretamente.',
        whyTitle: '🛒 Por que usar no Merka?',
        why: 'Com Lightning, você recebe pagamentos de qualquer pessoa no mundo em segundos, sem precisar de banco, PayPal ou intermediário. Basta compartilhar seu endereço Lightning no seu perfil.',
        walletsTitle: '📲 Carteiras recomendadas',
        beginnerLabel: 'Iniciante',
        nostrLabel: 'Ideal p/ Nostr',
        intermediateLabel: 'Intermediário',
        advancedLabel: 'Avançado',
        openWallet: 'Baixar',
        close: 'Entendi!',
    },
    en: {
        title: 'Bitcoin & Lightning',
        tagline: 'Digital money for the internet — fast, global, and without middlemen.',
        bitcoinTitle: '₿ What is Bitcoin?',
        bitcoin: 'Bitcoin is a decentralized digital currency created in 2009. It is not controlled by any government, bank, or company. You are the sole owner of your money — no borders, no blocks, no artificial inflation. It works 24/7, every day, in any country in the world.',
        lightningTitle: '⚡ What is the Lightning Network?',
        lightning: 'Lightning is a payment layer built on top of Bitcoin. It enables instant transactions with near-zero fees — perfect for everyday payments. On Merka, you can use a Lightning address (like an email for money, e.g. you@walletofsatoshi.com) to receive payments from buyers directly.',
        whyTitle: '🛒 Why use it on Merka?',
        why: 'With Lightning, you receive payments from anyone in the world in seconds, without needing a bank, PayPal, or any intermediary. Just share your Lightning address on your profile.',
        walletsTitle: '📲 Recommended wallets',
        beginnerLabel: 'Beginner',
        nostrLabel: 'Best for Nostr',
        intermediateLabel: 'Intermediate',
        advancedLabel: 'Advanced',
        openWallet: 'Download',
        close: 'Got it!',
    },
    es: {
        title: 'Bitcoin & Lightning',
        tagline: 'Dinero digital para internet — rápido, global y sin intermediarios.',
        bitcoinTitle: '₿ ¿Qué es Bitcoin?',
        bitcoin: 'Bitcoin es una moneda digital descentralizada creada en 2009. No está controlada por ningún gobierno, banco o empresa. Eres el único dueño de tu dinero — sin fronteras, sin bloqueos, sin inflación artificial. Funciona 24/7, todos los días, en cualquier país del mundo.',
        lightningTitle: '⚡ ¿Qué es la Lightning Network?',
        lightning: 'Lightning es una capa de pagos construida sobre Bitcoin. Permite transacciones instantáneas con comisiones casi nulas — ideal para pagos del día a día. En Merka, puedes usar una dirección Lightning (como un correo para dinero, ej: tu@walletofsatoshi.com) para recibir pagos de compradores directamente.',
        whyTitle: '🛒 ¿Por qué usarlo en Merka?',
        why: 'Con Lightning, recibes pagos de cualquier persona en el mundo en segundos, sin necesitar banco, PayPal ni intermediario. Solo comparte tu dirección Lightning en tu perfil.',
        walletsTitle: '📲 Billeteras recomendadas',
        beginnerLabel: 'Principiante',
        nostrLabel: 'Ideal p/ Nostr',
        intermediateLabel: 'Intermedio',
        advancedLabel: 'Avanzado',
        openWallet: 'Descargar',
        close: '¡Entendido!',
    },
    it: {
        title: 'Bitcoin & Lightning',
        tagline: 'Denaro digitale per internet — veloce, globale e senza intermediari.',
        bitcoinTitle: '₿ Cos\'è Bitcoin?',
        bitcoin: 'Bitcoin è una valuta digitale decentralizzata creata nel 2009. Non è controllata da alcun governo, banca o azienda. Sei l\'unico proprietario del tuo denaro — senza confini, senza blocchi, senza inflazione artificiale. Funziona 24/7, ogni giorno, in qualsiasi paese del mondo.',
        lightningTitle: '⚡ Cos\'è la Lightning Network?',
        lightning: 'Lightning è uno strato di pagamenti costruito su Bitcoin. Consente transazioni istantanee con commissioni quasi zero — ideale per i pagamenti quotidiani. Su Merka, puoi usare un indirizzo Lightning (come un\'email per i soldi, es: tu@walletofsatoshi.com) per ricevere pagamenti dagli acquirenti direttamente.',
        whyTitle: '🛒 Perché usarlo su Merka?',
        why: 'Con Lightning, ricevi pagamenti da chiunque nel mondo in pochi secondi, senza bisogno di banca, PayPal o intermediari. Basta condividere il tuo indirizzo Lightning nel tuo profilo.',
        walletsTitle: '📲 Portafogli consigliati',
        beginnerLabel: 'Principiante',
        nostrLabel: 'Ideale per Nostr',
        intermediateLabel: 'Intermedio',
        advancedLabel: 'Avanzato',
        openWallet: 'Scarica',
        close: 'Capito!',
    },
    de: {
        title: 'Bitcoin & Lightning',
        tagline: 'Digitales Geld für das Internet — schnell, global und ohne Mittelsmänner.',
        bitcoinTitle: '₿ Was ist Bitcoin?',
        bitcoin: 'Bitcoin ist eine dezentralisierte digitale Währung, die 2009 geschaffen wurde. Sie wird von keiner Regierung, Bank oder Firma kontrolliert. Du bist der alleinige Besitzer deines Geldes — keine Grenzen, keine Sperren, keine künstliche Inflation. Es funktioniert rund um die Uhr, jeden Tag, in jedem Land der Welt.',
        lightningTitle: '⚡ Was ist das Lightning Network?',
        lightning: 'Lightning ist eine Zahlungsschicht, die auf Bitcoin aufgebaut ist. Sie ermöglicht sofortige Transaktionen mit nahezu null Gebühren — ideal für Alltagszahlungen. Auf Merka kannst du eine Lightning-Adresse (wie eine E-Mail für Geld, z.B. du@walletofsatoshi.com) nutzen, um direkt Zahlungen von Käufern zu empfangen.',
        whyTitle: '🛒 Warum auf Merka nutzen?',
        why: 'Mit Lightning empfängst du Zahlungen von jedem auf der Welt in Sekunden, ohne Bank, PayPal oder Vermittler. Teile einfach deine Lightning-Adresse in deinem Profil.',
        walletsTitle: '📲 Empfohlene Wallets',
        beginnerLabel: 'Anfänger',
        nostrLabel: 'Ideal für Nostr',
        intermediateLabel: 'Fortgeschritten',
        advancedLabel: 'Experte',
        openWallet: 'Herunterladen',
        close: 'Verstanden!',
    },
    hi: {
        title: 'Bitcoin & Lightning',
        tagline: 'इंटरनेट का डिजिटल पैसा — तेज़, वैश्विक और बिना बिचौलियों के।',
        bitcoinTitle: '₿ Bitcoin क्या है?',
        bitcoin: 'Bitcoin 2009 में बनाई गई एक विकेंद्रीकृत डिजिटल मुद्रा है। इसे कोई सरकार, बैंक या कंपनी नियंत्रित नहीं करती। आप अपने पैसे के एकमात्र मालिक हैं — कोई सीमा नहीं, कोई ब्लॉक नहीं। यह दुनिया के किसी भी देश में 24/7 काम करता है।',
        lightningTitle: '⚡ Lightning Network क्या है?',
        lightning: 'Lightning Bitcoin के ऊपर बना एक भुगतान नेटवर्क है। यह लगभग शून्य शुल्क के साथ तत्काल लेनदेन को सक्षम बनाता है। Merka पर, आप एक Lightning address (जैसे पैसे के लिए ईमेल, जैसे: aap@walletofsatoshi.com) का उपयोग करके सीधे खरीदारों से भुगतान प्राप्त कर सकते हैं।',
        whyTitle: '🛒 Merka पर क्यों उपयोग करें?',
        why: 'Lightning के साथ, आप बिना बैंक या बिचौलिये के दुनिया में किसी से भी सेकंडों में भुगतान प्राप्त कर सकते हैं।',
        walletsTitle: '📲 अनुशंसित वॉलेट',
        beginnerLabel: 'शुरुआती',
        nostrLabel: 'Nostr के लिए सर्वश्रेष्ठ',
        intermediateLabel: 'मध्यवर्ती',
        advancedLabel: 'उन्नत',
        openWallet: 'डाउनलोड करें',
        close: 'समझ गया!',
    },
    ja: {
        title: 'Bitcoin & Lightning',
        tagline: 'インターネットのデジタルマネー — 高速、グローバル、仲介者なし。',
        bitcoinTitle: '₿ Bitcoinとは？',
        bitcoin: 'Bitcoinは2009年に作られた分散型デジタル通貨です。政府、銀行、企業のいずれにも管理されていません。あなただけがお金の所有者です — 国境なし、ブロックなし。世界中どこでも24時間365日使えます。',
        lightningTitle: '⚡ Lightning Networkとは？',
        lightning: 'LightningはBitcoinの上に構築された決済レイヤーです。手数料ほぼゼロで即座の取引が可能です。Merkaでは、Lightningアドレス（お金のためのメールアドレス、例：you@walletofsatoshi.com）を使って買い手から直接支払いを受け取ることができます。',
        whyTitle: '🛒 Merkaで使う理由は？',
        why: 'Lightningを使えば、銀行やPayPalなしで世界中の誰からも数秒で支払いを受け取れます。プロフィールにLightningアドレスを共有するだけです。',
        walletsTitle: '📲 おすすめウォレット',
        beginnerLabel: '初心者',
        nostrLabel: 'Nostrに最適',
        intermediateLabel: '中級者',
        advancedLabel: '上級者',
        openWallet: 'ダウンロード',
        close: 'わかった！',
    },
    zh: {
        title: 'Bitcoin & Lightning',
        tagline: '互联网的数字货币 — 快速、全球化、无中间商。',
        bitcoinTitle: '₿ 什么是比特币？',
        bitcoin: '比特币是2009年创建的去中心化数字货币。它不受任何政府、银行或公司控制。您是自己资产的唯一所有者 — 无边界、无封锁、无人为通货膨胀。全天候运行，全年无休，覆盖全球任何国家。',
        lightningTitle: '⚡ 什么是闪电网络？',
        lightning: '闪电网络是构建在比特币之上的支付层。它实现几乎零手续费的即时交易，非常适合日常支付。在Merka上，您可以使用闪电地址（类似于钱的电子邮件，例如：you@walletofsatoshi.com）直接接收买家付款。',
        whyTitle: '🛒 为什么在Merka上使用？',
        why: '通过闪电网络，您可以在几秒钟内从世界任何地方接收付款，无需银行、PayPal或中间商。只需在个人资料中分享您的闪电地址即可。',
        walletsTitle: '📲 推荐钱包',
        beginnerLabel: '初学者',
        nostrLabel: '最适合Nostr',
        intermediateLabel: '中级',
        advancedLabel: '高级',
        openWallet: '下载',
        close: '明白了！',
    },
    ar: {
        title: 'Bitcoin & Lightning',
        tagline: 'المال الرقمي للإنترنت — سريع، عالمي، وبدون وسطاء.',
        bitcoinTitle: '₿ ما هو Bitcoin؟',
        bitcoin: 'Bitcoin عملة رقمية لامركزية أُنشئت عام 2009. لا تتحكم بها أي حكومة أو بنك أو شركة. أنت المالك الوحيد لأموالك — بلا حدود، بلا قيود، بلا تضخم مصطنع. تعمل على مدار الساعة طوال أيام الأسبوع في أي بلد في العالم.',
        lightningTitle: '⚡ ما هي شبكة Lightning؟',
        lightning: 'Lightning طبقة دفع مبنية فوق Bitcoin. تتيح معاملات فورية برسوم شبه معدومة — مثالية للمدفوعات اليومية. في Merka، يمكنك استخدام عنوان Lightning (مثل البريد الإلكتروني للمال، مثال: you@walletofsatoshi.com) لاستقبال المدفوعات من المشترين مباشرة.',
        whyTitle: '🛒 لماذا تستخدمه على Merka؟',
        why: 'مع Lightning، تستقبل المدفوعات من أي شخص في العالم في ثوانٍ، دون الحاجة إلى بنك أو PayPal أو وسيط. فقط شارك عنوان Lightning الخاص بك في ملفك الشخصي.',
        walletsTitle: '📲 المحافظ الموصى بها',
        beginnerLabel: 'مبتدئ',
        nostrLabel: 'الأفضل لـ Nostr',
        intermediateLabel: 'متوسط',
        advancedLabel: 'متقدم',
        openWallet: 'تحميل',
        close: 'فهمت!',
    },
};

const levelColors: Record<string, string> = {
    beginner: 'rgba(16,185,129,0.15)',
    nostr: 'rgba(139,92,246,0.15)',
    intermediate: 'rgba(59,130,246,0.15)',
    advanced: 'rgba(239,68,68,0.12)',
};
const levelBorders: Record<string, string> = {
    beginner: 'rgba(16,185,129,0.3)',
    nostr: 'rgba(139,92,246,0.3)',
    intermediate: 'rgba(59,130,246,0.3)',
    advanced: 'rgba(239,68,68,0.25)',
};
const levelTextColors: Record<string, string> = {
    beginner: 'var(--accent)',
    nostr: 'var(--purple)',
    intermediate: 'var(--primary)',
    advanced: 'var(--danger)',
};

// ── Component ─────────────────────────────────────────────────────────────────
interface WalletGuideProps {
    lang: LangCode;
    onClose: () => void;
}

export function WalletGuide({ lang, onClose }: WalletGuideProps) {
    const c = content[lang] ?? content.en!;
    const isRTL = lang === 'ar';
    const dragProps = useDragToClose(onClose);

    const levelLabel = (level: string) => {
        const map: Record<string, string> = {
            beginner: c.beginnerLabel,
            nostr: c.nostrLabel,
            intermediate: c.intermediateLabel,
            advanced: c.advancedLabel,
        };
        return map[level] ?? level;
    };

    return (
        <div className="modal-overlay" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
            <div
                className="modal-box about-nostr-box wallet-guide-box"
                onClick={e => e.stopPropagation()}
                {...dragProps}
            >
                {/* Header */}
                <div className="about-nostr-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.85rem', flex: 1, minWidth: 0 }}>
                        <div className="modal-header-icon icon-btc"><BitcoinIcon size={20} /></div>
                        <div>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)' }}>
                                {c.title}
                            </h2>
                            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                                {c.tagline}
                            </p>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem', flexShrink: 0 }}><XIcon /></button>
                </div>

                {/* Scrollable body */}
                <div className="about-nostr-body">
                    {/* Bitcoin */}
                    <div className="wallet-section">
                        <h3 className="wallet-section-title">{c.bitcoinTitle}</h3>
                        <p className="about-text">{c.bitcoin}</p>
                    </div>

                    {/* Lightning */}
                    <div className="wallet-section">
                        <h3 className="wallet-section-title" style={{ color: 'var(--warning)' }}>
                            {c.lightningTitle}
                        </h3>
                        <p className="about-text">{c.lightning}</p>
                    </div>

                    {/* Why Merka */}
                    <div className="wallet-section" style={{
                        background: 'rgba(16,185,129,0.06)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '10px',
                        padding: '.85rem 1rem',
                    }}>
                        <h3 className="wallet-section-title" style={{ color: 'var(--accent)', marginBottom: '.35rem' }}>
                            {c.whyTitle}
                        </h3>
                        <p className="about-text" style={{ margin: 0 }}>{c.why}</p>
                    </div>

                    {/* Wallets */}
                    <div className="wallet-section">
                        <h3 className="wallet-section-title">{c.walletsTitle}</h3>
                        <div className="wallet-grid">
                            {wallets.map(w => (
                                <a
                                    key={w.name}
                                    href={w.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="wallet-card"
                                    style={{
                                        background: levelColors[w.level],
                                        borderColor: levelBorders[w.level],
                                    }}
                                >
                                    <span className="wallet-icon">{w.icon}</span>
                                    <div className="wallet-info">
                                        <span className="wallet-name">{w.name}</span>
                                        <span className="wallet-tag">{w.tag}</span>
                                    </div>
                                    <span
                                        className="wallet-level-badge"
                                        style={{ color: levelTextColors[w.level], borderColor: levelBorders[w.level] }}
                                    >
                                        {levelLabel(w.level)}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={onClose} style={{ width: '100%', background: 'var(--warning)', marginTop: '.5rem' }}>
                    {c.close}
                </button>
            </div>
        </div>
    );
}
