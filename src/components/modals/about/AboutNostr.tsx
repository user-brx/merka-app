import type { LangCode } from '../../../i18n/translations';

const content: Record<LangCode, {
    title: string; tagline: string;
    whatTitle: string; what: string;
    noServerTitle: string; noServer: string;
    keysTitle: string; keysPublic: string; keysPrivate: string; keysWarning: string;
    clientsTitle: string;
    merkaTitle: string; merka: string;
    close: string;
}> = {
    pt: {
        title: '🔮 O que é o Nostr?',
        tagline: 'O protocolo de comunicação aberto que alimenta o Merka.',
        whatTitle: 'O que é o Nostr?',
        what: 'Nostr é um protocolo de comunicação descentralizado — como o e-mail, mas para redes sociais e mercados. Qualquer pessoa pode participar sem precisar de uma empresa ou servidor central. Não existe um "dono" do Nostr: é um padrão aberto que qualquer software pode usar.',
        noServerTitle: '🌐 Sem servidor, sem banco de dados, sem API',
        noServer: 'O Merka não possui servidor próprio, banco de dados ou API central. Tudo o que você publica vai diretamente para a rede Nostr (via "relays" — servidores públicos e independentes). Seus dados pertencem a você. Nenhuma empresa pode apagar sua conta ou bloquear seu acesso.',
        keysTitle: '🔑 Suas Chaves — Cuide bem delas!',
        keysPublic: '🟢 Chave Pública (npub): É como seu nome de usuário. Pode compartilhar livremente com qualquer pessoa.',
        keysPrivate: '🔴 Chave Privada (nsec): É sua senha e identidade digital. NUNCA compartilhe com ninguém. Quem tiver sua chave privada tem controle total da sua conta.',
        keysWarning: '⚠️ Atenção: O Merka não armazena sua chave privada em nenhum servidor. Se você perder ou esquecer, não há como recuperar — não existe "esqueci minha senha". Anote sua chave privada em um lugar seguro, offline.',
        clientsTitle: '🚀 Acesse o Nostr por outros clientes',
        merkaTitle: '🛒 Nostr no Merka',
        merka: 'O Merka usa o Nostr para publicar anúncios de compra e venda, responder, curtir e enviar mensagens privadas — tudo diretamente na rede, sem intermediários.',
        close: 'Entendi!',
    },
    en: {
        title: '🔮 What is Nostr?',
        tagline: 'The open communication protocol powering Merka.',
        whatTitle: 'What is Nostr?',
        what: 'Nostr is a decentralized communication protocol — like email, but for social networks and marketplaces. Anyone can participate without a central company or server. There is no "owner" of Nostr: it is an open standard that any software can use.',
        noServerTitle: '🌐 No Server, No Database, No API',
        noServer: 'Merka has no server, database, or central API. Everything you publish goes directly to the Nostr network (via "relays" — independent public servers). Your data belongs to you. No company can delete your account or block your access.',
        keysTitle: '🔑 Your Keys — Keep them safe!',
        keysPublic: '🟢 Public Key (npub): This is like your username. You can share it freely with anyone.',
        keysPrivate: '🔴 Private Key (nsec): This is your password and digital identity. NEVER share it with anyone. Whoever has your private key has full control of your account.',
        keysWarning: '⚠️ Warning: Merka does not store your private key on any server. If you lose it, there is no way to recover it — there is no "forgot my password". Write your private key down and keep it somewhere safe, offline.',
        clientsTitle: '🚀 Access Nostr via other clients',
        merkaTitle: '🛒 Nostr on Merka',
        merka: 'Merka uses Nostr to publish buy/sell listings, reply, like, and send private messages — all directly on the network, with no intermediaries.',
        close: 'Got it!',
    },
    es: {
        title: '🔮 ¿Qué es Nostr?',
        tagline: 'El protocolo de comunicación abierta que impulsa Merka.',
        whatTitle: '¿Qué es Nostr?',
        what: 'Nostr es un protocolo de comunicación descentralizado — como el email, pero para redes sociales y mercados. Cualquiera puede participar sin necesitar una empresa o servidor central. No hay un "dueño" de Nostr: es un estándar abierto que cualquier software puede usar.',
        noServerTitle: '🌐 Sin servidor, sin base de datos, sin API',
        noServer: 'Merka no tiene servidor propio, base de datos ni API central. Todo lo que publicas va directamente a la red Nostr (via "relays" — servidores públicos independientes). Tus datos son tuyos. Ninguna empresa puede eliminar tu cuenta o bloquearte.',
        keysTitle: '🔑 Tus Claves — ¡Cuídalas bien!',
        keysPublic: '🟢 Clave Pública (npub): Es como tu nombre de usuario. Puedes compartirla libremente.',
        keysPrivate: '🔴 Clave Privada (nsec): Es tu contraseña e identidad digital. NUNCA la compartas con nadie. Quien tenga tu clave privada tiene control total de tu cuenta.',
        keysWarning: '⚠️ Atención: Merka no almacena tu clave privada en ningún servidor. Si la pierdes, no hay forma de recuperarla — no existe "olvidé mi contraseña". Anota tu clave privada en un lugar seguro, sin conexión.',
        clientsTitle: '🚀 Accede a Nostr desde otros clientes',
        merkaTitle: '🛒 Nostr en Merka',
        merka: 'Merka usa Nostr para publicar anuncios de compra/venta, responder, dar likes y enviar mensajes privados — todo directamente en la red, sin intermediarios.',
        close: '¡Entendido!',
    },
    hi: {
        title: '🔮 Nostr क्या है?',
        tagline: 'Merka को चलाने वाला खुला संचार प्रोटोकॉल।',
        whatTitle: 'Nostr क्या है?',
        what: 'Nostr एक विकेंद्रीकृत संचार प्रोटोकॉल है — ईमेल जैसा, लेकिन सोशल नेटवर्क और बाज़ारों के लिए। कोई भी बिना किसी केंद्रीय कंपनी या सर्वर के भाग ले सकता है। Nostr का कोई "मालिक" नहीं है — यह एक खुला मानक है।',
        noServerTitle: '🌐 कोई सर्वर नहीं, कोई डेटाबेस नहीं, कोई API नहीं',
        noServer: 'Merka का अपना कोई सर्वर, डेटाबेस या API नहीं है। आपकी सभी पोस्ट सीधे Nostr नेटवर्क (relays) पर जाती हैं। आपका डेटा आपका है।',
        keysTitle: '🔑 आपकी चाबियाँ — सुरक्षित रखें!',
        keysPublic: '🟢 सार्वजनिक चाबी (npub): यह आपका उपयोगकर्ता नाम है। इसे स्वतंत्र रूप से शेयर करें।',
        keysPrivate: '🔴 निजी चाबी (nsec): यह आपका पासवर्ड है। इसे किसी के साथ साझा न करें।',
        keysWarning: '⚠️ चेतावनी: Merka आपकी निजी चाबी किसी सर्वर पर संग्रहीत नहीं करता। यदि आप इसे खो देते हैं, तो इसे पुनर्प्राप्त करना संभव नहीं है। इसे ऑफलाइन सुरक्षित स्थान पर लिखें।',
        clientsTitle: '🚀 अन्य Nostr क्लाइंट से एक्सेस करें',
        merkaTitle: '🛒 Merka पर Nostr',
        merka: 'Merka खरीद/बिक्री पोस्ट, जवाब, लाइक और निजी संदेशों के लिए Nostr का उपयोग करता है — बिना किसी मध्यस्थ के।',
        close: 'समझ गया!',
    },
    ja: {
        title: '🔮 Nostrとは？',
        tagline: 'Merkaを支えるオープンな通信プロトコル。',
        whatTitle: 'Nostrとは？',
        what: 'Nostrは分散型の通信プロトコルです — メールに似ていますが、SNSやマーケットプレイス向けです。中央のサーバーや企業なしに誰でも参加できます。Nostrには「オーナー」がいません。誰でも使えるオープンな規格です。',
        noServerTitle: '🌐 サーバーなし・データベースなし・APIなし',
        noServer: 'Merkaは独自のサーバー、データベース、APIを持っていません。投稿はすべてNostrネットワーク（relay）に直接送られます。あなたのデータはあなたのものです。',
        keysTitle: '🔑 あなたの鍵 — 大切にしてください！',
        keysPublic: '🟢 公開鍵 (npub)：ユーザー名のようなものです。自由に共有できます。',
        keysPrivate: '🔴 秘密鍵 (nsec)：パスワードでありデジタルIDです。絶対に誰にも教えないでください。',
        keysWarning: '⚠️ 警告：Merkaはあなたの秘密鍵をサーバーに保存しません。失くした場合、復元する方法はありません。オフラインの安全な場所に書き留めておいてください。',
        clientsTitle: '🚀 他のNostrクライアントでアクセス',
        merkaTitle: '🛒 MerkaのNostr活用',
        merka: 'Merkaは売買投稿、返信、いいね、ダイレクトメッセージにNostrを使用しています — 中間業者なしで直接ネットワーク上で行われます。',
        close: '了解！',
    },
    zh: {
        title: '🔮 什么是 Nostr？',
        tagline: '驱动 Merka 的开放通信协议。',
        whatTitle: '什么是 Nostr？',
        what: 'Nostr 是一种去中心化通信协议——类似于电子邮件，但专为社交网络和市场设计。任何人无需中央公司或服务器即可参与。Nostr 没有"所有者"：这是任何软件都可以使用的开放标准。',
        noServerTitle: '🌐 无服务器、无数据库、无 API',
        noServer: 'Merka 没有自己的服务器、数据库或中央 API。您发布的所有内容都直接发送到 Nostr 网络（通过"relays"——独立的公共服务器）。您的数据属于您，没有公司可以删除您的账户。',
        keysTitle: '🔑 您的密钥 — 请妥善保管！',
        keysPublic: '🟢 公钥 (npub)：这是您的用户名，可以自由分享。',
        keysPrivate: '🔴 私钥 (nsec)：这是您的密码和数字身份，切勿与任何人分享。',
        keysWarning: '⚠️ 警告：Merka 不在任何服务器上存储您的私钥。如果丢失，将无法恢复——没有"忘记密码"功能。请将私钥写下来保存在安全的离线位置。',
        clientsTitle: '🚀 通过其他客户端访问 Nostr',
        merkaTitle: '🛒 Merka 上的 Nostr',
        merka: 'Merka 使用 Nostr 发布买卖信息、回复、点赞和私信——直接在网络上进行，无需中间商。',
        close: '明白了！',
    },
    it: {
        title: '🔮 Cos\'è Nostr?',
        tagline: 'Il protocollo di comunicazione aperto che alimenta Merka.',
        whatTitle: 'Cos\'è Nostr?',
        what: 'Nostr è un protocollo di comunicazione decentralizzato — come l\'e-mail, ma per social network e mercati. Chiunque può partecipare senza un\'azienda o server centrale. Non c\'è un "proprietario" di Nostr: è uno standard aperto che qualsiasi software può usare.',
        noServerTitle: '🌐 Nessun server, nessun database, nessuna API',
        noServer: 'Merka non ha server, database o API centrali. Tutto ciò che pubblichi va direttamente alla rete Nostr (tramite "relays" — server pubblici indipendenti). I tuoi dati ti appartengono.',
        keysTitle: '🔑 Le tue chiavi — Conservale al sicuro!',
        keysPublic: '🟢 Chiave pubblica (npub): È come il tuo nome utente. Puoi condividerla liberamente.',
        keysPrivate: '🔴 Chiave privata (nsec): È la tua password e identità digitale. NON condividerla mai con nessuno.',
        keysWarning: '⚠️ Attenzione: Merka non memorizza la tua chiave privata. Se la perdi, non c\'è modo di recuperarla. Annota la tua chiave privata e conservala in un luogo sicuro, offline.',
        clientsTitle: '🚀 Accedi a Nostr tramite altri client',
        merkaTitle: '🛒 Nostr su Merka',
        merka: 'Merka usa Nostr per pubblicare annunci di acquisto/vendita, rispondere, mettere mi piace e inviare messaggi privati — tutto direttamente sulla rete, senza intermediari.',
        close: 'Capito!',
    },

    ru: {
        title: '🔮 What is Nostr?', tagline: 'A simple protocol for decentralized social networking and messaging.',
        whatTitle: 'What it is:', what: 'Nostr allows anyone to build censorship-resistant applications. Your data is cryptographically tied to you and not reliant on any central platform.',
        noServerTitle: 'No central server:', noServer: 'Instead of talking to one server like Twitter, clients publish messages to multiple independent "relays".',
        keysTitle: 'Your Keys, Your Identity:',
        keysPublic: 'Public Key (npub): Your username. Share this so people can find you.',
        keysPrivate: 'Private Key (nsec): Your password. Keep this SECRET. Whoever has this key controls your account.',
        keysWarning: 'If you lose your nsec, you lose your account. There is no password recovery on Nostr.',
        clientsTitle: 'Clients:',
        merkaTitle: 'Merka:', merka: 'Is just one of many ways to access the Nostr network. You can take your keys and use any other app!',
        close: 'Close'
    },
    fr: {
        title: '🔮 What is Nostr?', tagline: 'A simple protocol for decentralized social networking and messaging.',
        whatTitle: 'What it is:', what: 'Nostr allows anyone to build censorship-resistant applications. Your data is cryptographically tied to you and not reliant on any central platform.',
        noServerTitle: 'No central server:', noServer: 'Instead of talking to one server like Twitter, clients publish messages to multiple independent "relays".',
        keysTitle: 'Your Keys, Your Identity:',
        keysPublic: 'Public Key (npub): Your username. Share this so people can find you.',
        keysPrivate: 'Private Key (nsec): Your password. Keep this SECRET. Whoever has this key controls your account.',
        keysWarning: 'If you lose your nsec, you lose your account. There is no password recovery on Nostr.',
        clientsTitle: 'Clients:',
        merkaTitle: 'Merka:', merka: 'Is just one of many ways to access the Nostr network. You can take your keys and use any other app!',
        close: 'Close'
    },
    tr: {
        title: '🔮 What is Nostr?', tagline: 'A simple protocol for decentralized social networking and messaging.',
        whatTitle: 'What it is:', what: 'Nostr allows anyone to build censorship-resistant applications. Your data is cryptographically tied to you and not reliant on any central platform.',
        noServerTitle: 'No central server:', noServer: 'Instead of talking to one server like Twitter, clients publish messages to multiple independent "relays".',
        keysTitle: 'Your Keys, Your Identity:',
        keysPublic: 'Public Key (npub): Your username. Share this so people can find you.',
        keysPrivate: 'Private Key (nsec): Your password. Keep this SECRET. Whoever has this key controls your account.',
        keysWarning: 'If you lose your nsec, you lose your account. There is no password recovery on Nostr.',
        clientsTitle: 'Clients:',
        merkaTitle: 'Merka:', merka: 'Is just one of many ways to access the Nostr network. You can take your keys and use any other app!',
        close: 'Close'
    },
    de: {
        title: '🔮 Was ist Nostr?',
        tagline: 'Das offene Kommunikationsprotokoll hinter Merka.',
        whatTitle: 'Was ist Nostr?',
        what: 'Nostr ist ein dezentrales Kommunikationsprotokoll — wie E-Mail, aber für soziale Netzwerke und Marktplätze. Jeder kann teilnehmen, ohne ein zentrales Unternehmen oder Server. Es gibt keinen "Eigentümer" von Nostr: Es ist ein offener Standard.',
        noServerTitle: '🌐 Kein Server, keine Datenbank, keine API',
        noServer: 'Merka hat keinen Server, keine Datenbank oder zentrale API. Alles, was Sie veröffentlichen, geht direkt an das Nostr-Netzwerk. Ihre Daten gehören Ihnen.',
        keysTitle: '🔑 Ihre Schlüssel — Bewahren Sie sie sicher auf!',
        keysPublic: '🟢 Öffentlicher Schlüssel (npub): Das ist wie Ihr Benutzername. Sie können ihn frei teilen.',
        keysPrivate: '🔴 Privater Schlüssel (nsec): Das ist Ihr Passwort. Teilen Sie es NIEMALS mit jemandem.',
        keysWarning: '⚠️ Warnung: Merka speichert Ihren privaten Schlüssel nicht. Wenn Sie ihn verlieren, gibt es keine Möglichkeit, ihn wiederherzustellen. Notieren Sie sich Ihren privaten Schlüssel sicher.',
        clientsTitle: '🚀 Zugriff auf Nostr über andere Clients',
        merkaTitle: '🛒 Nostr auf Merka',
        merka: 'Merka nutzt Nostr, um Kauf-/Verkaufsangebote zu veröffentlichen, zu antworten und private Nachrichten zu senden — ohne Zwischenhändler.',
        close: 'Verstanden!',
    },
    ar: {
        title: '🔮 ما هو Nostr؟',
        tagline: 'بروتوكول الاتصال المفتوح الذي يشغل Merka.',
        whatTitle: 'ما هو Nostr؟',
        what: 'Nostr هو بروتوكول اتصال لامركزي - مثل البريد الإلكتروني، ولكن للشبكات الاجتماعية والأسواق. يمكن لأي شخص المشاركة بدون شركة مركزية أو خادم.',
        noServerTitle: '🌐 لا خادم، لا قاعدة بيانات، لا API',
        noServer: 'لا يمتلك Merka خادمًا خاصًا به. كل ما تنشره يذهب مباشرة إلى شبكة Nostr. بياناتك تخصك.',
        keysTitle: '🔑 مفاتيحك — حافظ عليها آمنة!',
        keysPublic: '🟢 المفتاح العام (npub): هذا مثل اسم المستخدم الخاص بك. يمكنك مشاركته بحرية.',
        keysPrivate: '🔴 المفتاح الخاص (nsec): هذه هي كلمة المرور الخاصة بك. لا تشاركه مع أحد.',
        keysWarning: '⚠️ تحذير: لا يقوم Merka بتخزين مفتاحك الخاص. إذا فقدته، فلا توجد طريقة لاستعادته. احتفظ به في مكان آمن، دون اتصال بالإنترنت.',
        clientsTitle: '🚀 الوصول إلى Nostr عبر عملاء آخرين',
        merkaTitle: '🛒 Nostr في Merka',
        merka: 'يستخدم Merka بروتوكول Nostr لنشر إعلانات البيع والشراء والردود والرسائل الخاصة — كل ذلك مباشرة على الشبكة، بدون وسطاء.',
        close: 'فهمت!',
    },
    fa: { title: '🔮 What is Nostr?', tagline: 'The open protocol powering Merka.', whatTitle: 'What is Nostr?', what: 'Decentralized communication.', noServerTitle: 'No Servers', noServer: 'Your data belongs to you.', keysTitle: 'Your Keys', keysPublic: 'Public (npub)', keysPrivate: 'Private (nsec)', keysWarning: 'Never share it.', clientsTitle: 'Clients', merkaTitle: 'Merka on Nostr', merka: 'Merka uses Nostr.', close: 'Close' },
    vi: { title: '🔮 What is Nostr?', tagline: 'The open protocol powering Merka.', whatTitle: 'What is Nostr?', what: 'Decentralized communication.', noServerTitle: 'No Servers', noServer: 'Your data belongs to you.', keysTitle: 'Your Keys', keysPublic: 'Public (npub)', keysPrivate: 'Private (nsec)', keysWarning: 'Never share it.', clientsTitle: 'Clients', merkaTitle: 'Merka on Nostr', merka: 'Merka uses Nostr.', close: 'Close' },
    uk: { title: '🔮 Що таке Nostr?', tagline: 'Відкритий протокол.', whatTitle: 'Що це?', what: 'Децентралізована мережа.', noServerTitle: 'Без серверів', noServer: 'Ваші дані ваші.', keysTitle: 'Ваші ключі', keysPublic: 'Публічний', keysPrivate: 'Приватний', keysWarning: 'Нікому не давайте.', clientsTitle: 'Клієнти', merkaTitle: 'Merka на Nostr', merka: 'Спосіб доступу.', close: 'Зрозуміло' },
};

const clients = [
    { name: 'Damus', url: 'https://damus.io', desc: 'iOS' },
    { name: 'Amethyst', url: 'https://github.com/vitorpamplona/amethyst', desc: 'Android' },
    { name: 'Snort', url: 'https://snort.social', desc: 'Web' },
    { name: 'Primal', url: 'https://primal.net', desc: 'Web/iOS/Android' },
    { name: 'Nostr.com', url: 'https://nostr.com', desc: 'Official' },
];

interface AboutNostrProps { lang: LangCode; onClose: () => void; }

export function AboutNostr({ lang, onClose }: AboutNostrProps) {
    const c = content[lang] || content.en;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box about-nostr-box" onClick={e => e.stopPropagation()}>
                <div className="about-nostr-header">
                    <div>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '.2rem' }}>{c.title}</h2>
                        <p style={{ fontSize: '.85rem', color: 'var(--accent)', margin: 0 }}>{c.tagline}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem', flexShrink: 0 }}>✕</button>
                </div>

                <div className="about-nostr-body">
                    <section className="about-section">
                        <h3 className="about-section-title">{c.whatTitle}</h3>
                        <p className="about-section-text">{c.what}</p>
                    </section>

                    <section className="about-section about-section-accent">
                        <h3 className="about-section-title">{c.noServerTitle}</h3>
                        <p className="about-section-text">{c.noServer}</p>
                    </section>

                    <section className="about-section">
                        <h3 className="about-section-title">{c.keysTitle}</h3>
                        <div className="about-key-row">
                            <p className="about-section-text">{c.keysPublic}</p>
                            <p className="about-section-text">{c.keysPrivate}</p>
                        </div>
                        <div className="about-warning">
                            <p>{c.keysWarning}</p>
                        </div>
                    </section>

                    <section className="about-section">
                        <h3 className="about-section-title">{c.clientsTitle}</h3>
                        <div className="about-clients">
                            {clients.map(cl => (
                                <a key={cl.name} href={cl.url} target="_blank" rel="noopener noreferrer" className="about-client-pill">
                                    {cl.name} <span className="about-client-tag">{cl.desc}</span>
                                </a>
                            ))}
                        </div>
                    </section>

                    <section className="about-section about-section-merka">
                        <h3 className="about-section-title">{c.merkaTitle}</h3>
                        <p className="about-section-text">{c.merka}</p>
                    </section>
                </div>

                <button onClick={onClose} style={{ width: '100%', background: 'var(--accent)', marginTop: '.5rem' }}>
                    {c.close}
                </button>
            </div>
        </div>
    );
}

