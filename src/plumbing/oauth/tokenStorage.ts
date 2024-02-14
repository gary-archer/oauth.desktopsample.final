import {safeStorage} from 'electron';
import Store from 'electron-store';
import {TokenData} from './tokenData';

/*
 * A class to store our token data in secure storage
 */
export class TokenStorage {

    private static _key = 'DesktopSample.Tokens';
    private static _store = new Store<Record<string, string>>({
        name: 'desktopsample_tokens'
    });

    /*
     * Load token data or return null
     */
    public static load(): TokenData | null {

        const encryptedBytesBase64 = this._store.get(TokenStorage._key);
        if (!encryptedBytesBase64) {
            return null;
        }

        const json = safeStorage.decryptString(Buffer.from(encryptedBytesBase64, 'base64'));
        return JSON.parse(json);
    }

    /*
     * Save token data after login
     */
    public static save(data: TokenData): void {

        const json = JSON.stringify(data);
        const buffer = safeStorage.encryptString(json);
        const encryptedBytesBase64 = buffer.toString('base64');
        this._store.set(TokenStorage._key, encryptedBytesBase64);
    }

    /*
     * Delete token data after logout
     */
    public static delete(): void {
        this._store.delete(TokenStorage._key);
    }
}
