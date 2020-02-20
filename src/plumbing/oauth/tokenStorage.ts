import KeyTar from 'keytar';
import OperatingSystemUserName from 'username';
import {TokenData} from './tokenData';

/*
 * The keys under which we store auth state
 * We use separate keys due to the below Windows size limitation that causes a 'Stub received bad data' error
 * https://github.com/atom/node-keytar/issues/112
 */
const APP_STORAGE_ID_TOKEN = 'MyCompany.DesktopSample.IdToken';
const APP_STORAGE_REFRESH_TOKEN = 'MyCompany.DesktopSample.RefreshToken';

/*
 * A class to store our token data in secure storage
 */
export class TokenStorage {

    /*
     * Load token data or return null
     */
    public static async load(): Promise<TokenData | null> {

        // Get the operating system user name on the first call
        if (!TokenStorage._userName) {
            TokenStorage._userName = await OperatingSystemUserName();
        }

        // Look up tokens from secure storage
        const refreshToken = await KeyTar.getPassword(APP_STORAGE_REFRESH_TOKEN, this._userName);
        const idToken = await KeyTar.getPassword(APP_STORAGE_ID_TOKEN, this._userName);
        if (!refreshToken || !idToken) {
            return null;
        }

        // Convert to out token data object
        return {
            accessToken: '',
            refreshToken,
            idToken,
        };
    }

    /*
     * Save token data after login and prevent concurrency problems
     */
    public static async save(data: TokenData): Promise<void> {

        // If two UI fragments try to update storage at the same time then only the first one wins
        if (!TokenStorage._isSaving) {

            // Prevent re-entrancy
            TokenStorage._isSaving = true;
            try {

                // Save token data to secure storage
                await KeyTar.setPassword(APP_STORAGE_REFRESH_TOKEN, this._userName, data.refreshToken!);
                await KeyTar.setPassword(APP_STORAGE_ID_TOKEN, this._userName, data.idToken!);

            } finally {

                // Reset once complete
                TokenStorage._isSaving = false;
            }
        }
    }

    /*
     * Delete token data after logout
     */
    public static async delete(): Promise<void> {

        // Delete token data from secure storage
        await KeyTar.deletePassword(APP_STORAGE_ID_TOKEN, this._userName);
        await KeyTar.deletePassword(APP_STORAGE_REFRESH_TOKEN, this._userName);
    }

    /*
     * Internal fields
     */
    private static _userName: string;
    private static _isSaving = false;
}
