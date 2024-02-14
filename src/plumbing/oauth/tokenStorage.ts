import {safeStorage} from 'electron';
import Store from 'electron-store';
import {TokenData} from './tokenData';

/*
 * A class to store our token data in secure storage
 * https://freek.dev/2103-replacing-keytar-with-electrons-safestorage-in-ray
 *
 * Data is saved at app.getPath('userData'):
 * - Linux: ~/.config/finaldesktopapp/tokens.json
 */
export class TokenStorage {

    private static _key = 'EncryptedData';
    private static _store = new Store<Record<string, string>>({
        name: 'tokens'
    });

    /*
     * Load token data or return null
     */
    public static load(): TokenData | null {

        console.log('*** ENCRYPTION ***');
        console.log(safeStorage.isEncryptionAvailable());

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

        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('Cannot store tokens since encryption is unavailable');
        }

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
