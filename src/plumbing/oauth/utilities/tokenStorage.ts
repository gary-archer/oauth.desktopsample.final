import {TokenResponse, TokenResponseJson} from '@openid/appauth';
import KeyTar from 'keytar';
import OperatingSystemUserName from 'username';

/*
 * The key under which we store auth state
 */
const APP_STORAGE_ID = 'MyCompany.DesktopSample.TokenData';

/*
 * A class to store our token data in secure storage
 */
export class TokenStorage {

    /*
     * Load token data or return null
     */
    public static async load(): Promise<TokenResponse|null> {

        // Get the operating system user name on the first call
        if (!TokenStorage._userName) {
            TokenStorage._userName = await OperatingSystemUserName();
        }

        // Look up token text from secure storage
        const authState = await KeyTar.getPassword(APP_STORAGE_ID, this._userName);
        if (!authState) {
            return null;
        }

        // Convert to the AppAuth object
        const tokenJson = JSON.parse(authState) as TokenResponseJson;
        return new TokenResponse(tokenJson);
    }

    /*
     * Save token data after login and prevent concurrency problems
     */
    public static async save(data: TokenResponse): Promise<void> {

        // If two UI fragments try to update storage at the same time then only the first one wins
        if (!TokenStorage._isSaving) {

            // Prevent re-entrancy
            TokenStorage._isSaving = true;
            try {

                // Work around the Windows limitation that causes a 'Stub received bad data' error
                // https://github.com/atom/node-keytar/issues/112
                const clone = new TokenResponse(data.toJson());
                clone.accessToken = '';
                clone.idToken = '';

                // Convert the object to text
                const authState = JSON.stringify(clone.toJson());

                // Save token data to secure storage
                await KeyTar.setPassword(APP_STORAGE_ID, this._userName, authState);

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
        await KeyTar.deletePassword(APP_STORAGE_ID, this._userName);
    }

    /*
     * Internal fields
     */
    private static _userName: string;
    private static _isSaving = false;
}
