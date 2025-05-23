import {safeStorage} from 'electron';
import Store from 'electron-store';
import {TokenData} from './tokenData';

/*
 * A class to store OAuth tokens under the current user profile using operating system encryption
 */
export class TokenStorage {

    private readonly key = 'EncryptedData';
    private store = new Store<Record<string, string>>({
        name: 'tokens'
    });

    /*
     * Safe storage uses an operating system service but make sure we are not saving tokens insecurely
     */
    public constructor() {

        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('The environment does not support safe storage');
        }
    }

    /*
     * Load token data or return null
     */
    public load(): TokenData | null {

        try {

            // Try to read the file
            const encryptedBytesBase64 = this.store.get(this.key);
            if (!encryptedBytesBase64) {
                return null;
            }

            // Try the decryption using the operating system encryption key
            const json = safeStorage.decryptString(Buffer.from(encryptedBytesBase64, 'base64'));
            return JSON.parse(json);

        } catch {

            // Fail gracefully, eg if the encryption key has been deleted
            return null;
        }
    }

    /*
     * This saves token data to base64 encrypted bytes in a text file under the user profile
     */
    public save(data: TokenData): void {

        const json = JSON.stringify(data);
        const buffer = safeStorage.encryptString(json);
        const encryptedBytesBase64 = buffer.toString('base64');
        this.store.set(this.key, encryptedBytesBase64);
    }

    /*
     * Delete token data after logout
     */
    public delete(): void {
        this.store.delete(this.key);
    }
}
