import { nip19 } from 'nostr-tools';

export const APP_GUID = 'merka-app-9f8a2b3c';
export const APP_VERSION = __APP_VERSION__;

export const MERKA_NPUB = 'npub16djn9xucugk5wp76x0trhvy5eldv3juzwq92jng72ax26puzeyls327tm6';

// Decode npub to hex pubkey for filtering and tagging
export const MERKA_PUBKEY = (() => {
    try {
        const { type, data } = nip19.decode(MERKA_NPUB);
        if (type === 'npub') return data as string;
    } catch {
        console.warn("Invalid MERKA_NPUB");
    }
    return '';
})();

// Donation addresses
export const DONATION_LN = 'smarteranswer31@walletofsatoshi.com';
export const DONATION_BTC = 'bc1qxdmvlzvm4p9tle5vxfh0tyns3lwryet8886vrv';

