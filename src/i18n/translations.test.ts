/**
 * Testes de completude do sistema de i18n.
 * Garante que todas as 15 línguas têm as chaves obrigatórias preenchidas
 * e que nenhuma tradução está vazia ou é apenas whitespace.
 * Detecta regressões quando novas chaves são adicionadas sem tradução.
 */
import { describe, it, expect } from 'vitest';
import { translations, type LangCode, type Translations } from './translations';

const LANGS: LangCode[] = ['en', 'pt', 'es', 'it', 'de', 'hi', 'ja', 'zh', 'ar', 'ru', 'fr', 'tr', 'fa', 'vi', 'uk'];

// Chaves que são OBRIGATÓRIAS (não opcionais no interface Translations)
// Extraídas das chaves sem "?" na interface
const REQUIRED_KEYS: (keyof Translations)[] = [
    'title', 'subtitle', 'welcome', 'welcomeDesc',
    'genKeys', 'loginHeader', 'nsecPlaceholder', 'loginBtn',
    'invalidKey', 'profile', 'viewProfile', 'editProfile',
    'saveProfile', 'connected', 'logout', 'networkTitle', 'followers',
    'pubKey', 'secKey', 'copied', 'displayNameLabel',
    'whatsOnMind', 'publishing', 'publishNote',
    'globalFeed', 'myFeed', 'followingFeed',
    'listening', 'publishFail', 'buy', 'sell',
    'filterAll', 'filterMerka', 'pause', 'play',
    'reply', 'like', 'follow', 'following', 'unfollow', 'confirm',
    'zap', 'secretChat', 'sendReply', 'replyPlaceholder',
    'secretChatTitle', 'secretChatDesc', 'secretChatPlaceholder',
    'send', 'cancel',
    'zapTitle', 'zapInfo', 'zapPubkey', 'close',
    'dmSent', 'liked', 'followedToast', 'replySent',
    'displayName', 'bio', 'website',
    'lightningAddress', 'nip05',
    'addMoreInfo', 'hideMoreInfo',
    'noFollowing', 'noReplies',
    'chatWith', 'typeMsg', 'sendMsg', 'noMsgs',
    'profileUpdated', 'aboutMe',
    'loginTip', 'username',
    'whatIsNostr', 'aboutMerka',
    'saveYourKey', 'saveKeyDesc', 'keyWarningNote', 'savedKey',
    'keepPrivate', 'chatHistoryTitle', 'noChatHistory',
    'e2eNotice', 'expand', 'collapse',
    'donate', 'clearHistory', 'clearHistoryIndiv', 'confirmDelete', 'openChat', 'openInApp', 'walletGuide',
    'helpNip05', 'helpLud16', 'helpWebsite',
    'hintNostr', 'hintMerka', 'hintFollowing', 'hintMine', 'hintPlay', 'hintPause',
    'merkaConceitoTitle', 'merkaTagline', 'merkaConceitoText', 'merkaConceitoSub',
    'merkaManifestoTitle', 'merkaManifestoP1', 'merkaManifestoP2', 'merkaManifestoP3',
    'merkaManifestoP4', 'merkaManifestoP5', 'merkaManifestoP6', 'merkaManifestoP7',
    'merkaValueTitle', 'merkaValue1', 'merkaValue2', 'merkaValue3', 'merkaValue4', 'merkaValue5', 'merkaValue6',
    'merkaIdentityTitle',
    'merkaInfraTitle', 'merkaInfraText', 'merkaNetIsProduct',
    'merkaOpenSourceTitle', 'merkaOpenSourceText', 'merkaSupportCreator',
    'newMsgReceived',
    'logoutConfirmMsg', 'logoutConfirmBtn', 'sessionExpired',
    'searchPlaceholder', 'searchNostr', 'searchResults',
    'searchEmpty', 'searchSearching',
    'loading', 'loadMore24h',
    'langAll', 'langCurrent', 'post',
];

// ── Cobertura de idiomas ───────────────────────────────────────────────────────
describe('translations — cobertura de idiomas', () => {
    it('deve ter exatamente 15 idiomas definidos', () => {
        expect(Object.keys(translations)).toHaveLength(15);
    });

    it('deve ter todos os 15 códigos de idioma', () => {
        for (const lang of LANGS) {
            expect(translations[lang], `Idioma "${lang}" ausente`).toBeDefined();
        }
    });
});

// ── Chaves obrigatórias por idioma ────────────────────────────────────────────
describe('translations — chaves obrigatórias', () => {
    for (const lang of LANGS) {
        it(`[${lang}] deve ter todas as chaves obrigatórias preenchidas`, () => {
            const t = translations[lang];
            const missing: string[] = [];
            const empty: string[] = [];

            for (const key of REQUIRED_KEYS) {
                const val = t[key];
                if (val === undefined || val === null) {
                    missing.push(key as string);
                } else if (typeof val === 'string' && val.trim() === '') {
                    empty.push(key as string);
                }
            }

            if (missing.length > 0) {
                throw new Error(`[${lang}] Chaves ausentes: ${missing.join(', ')}`);
            }
            if (empty.length > 0) {
                throw new Error(`[${lang}] Chaves vazias: ${empty.join(', ')}`);
            }
        });
    }
});

// ── merkaIdentityPills ────────────────────────────────────────────────────────
describe('translations — merkaIdentityPills', () => {
    for (const lang of LANGS) {
        it(`[${lang}] deve ter merkaIdentityPills como array não-vazio`, () => {
            const pills = translations[lang].merkaIdentityPills;
            expect(Array.isArray(pills), `[${lang}] merkaIdentityPills deve ser array`).toBe(true);
            expect(pills.length, `[${lang}] merkaIdentityPills está vazio`).toBeGreaterThan(0);
            pills.forEach((p, i) => {
                expect(typeof p === 'string' && p.trim().length > 0,
                    `[${lang}] merkaIdentityPills[${i}] está vazio`).toBe(true);
            });
        });
    }
});

// ── Idioma base (en) como referência ──────────────────────────────────────────
describe('translations — consistência com base en', () => {
    const en = translations.en;
    const enKeys = Object.keys(en) as (keyof Translations)[];

    for (const lang of LANGS.filter(l => l !== 'en')) {
        it(`[${lang}] não deve ter chaves extras que não existem em en`, () => {
            const t = translations[lang];
            const tKeys = Object.keys(t) as (keyof Translations)[];
            const extra = tKeys.filter(k => !(k in en));
            expect(extra, `[${lang}] chaves extras: ${extra.join(', ')}`).toHaveLength(0);
        });
    }

    it('[en] deve ter todas as chaves da interface REQUIRED_KEYS', () => {
        for (const key of REQUIRED_KEYS) {
            expect(en[key], `en está faltando a chave "${key as string}"`).toBeDefined();
        }
    });

    it('[en] todas as chaves de string devem ter length > 0', () => {
        const empty = enKeys.filter(k => {
            const v = en[k];
            return typeof v === 'string' && v.trim() === '';
        });
        expect(empty, `en tem chaves de string vazias: ${empty.join(', ')}`).toHaveLength(0);
    });
});
