import {safeStorage} from 'electron';
import Store from 'electron-store';
import {TokenData} from './tokenData';

/*
 * A class to store OAuth tokens under the current user profile using operating system encryption
 */
export class TokenStorage {

    private readonly _key = 'EncryptedData';
    private _store = new Store<Record<string, string>>({
        name: 'tokens'
    });

    /*
     * Load token data or return null
     */
    public load(): TokenData | null {

        try {

            // Try to read the file
            const encryptedBytesBase64 = this._store.get(this._key);
            if (!encryptedBytesBase64) {
                return null;
            }

            // Try the decryption using the operating system encryption key
            const json = safeStorage.decryptString(Buffer.from(encryptedBytesBase64, 'base64'));
            return JSON.parse(json);

        } catch (e: any) {

            // Fail gracefully if the encryption key has been deleted
            console.log(`Decrpyion failure in TokenStorage.load: ${e}`);
            return null;
        }
    }

    /*
     * This saves token data to base64 encrypted bytes in a text file under the user profile
     */
    public save(data: TokenData): void {

        // Safe storage uses an operating system service but make sure we are not saving tokens insecurely
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('The environment does not support safe storage');
        }

        const json = JSON.stringify(data);
        const buffer = safeStorage.encryptString(json);
        const encryptedBytesBase64 = buffer.toString('base64');
        this._store.set(this._key, encryptedBytesBase64);
    }

    /*
     * Delete token data after logout
     */
    public delete(): void {
        this._store.delete(this._key);
    }
}
