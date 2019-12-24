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
     * Save token data after login
     */
    public static async save(data: TokenResponse): Promise<void> {

         // Work around the Windows limitation below by shortening the data to prevent a 'Stub received bad data' error
        // https://github.com/atom/node-keytar/issues/112
        const clone = new TokenResponse(data.toJson());
        clone.accessToken = '';
        clone.idToken = '';

        // Convert the object to text
        const authState = JSON.stringify(clone.toJson());

        try {
            // Save token data to secure storage
            await KeyTar.setPassword(APP_STORAGE_ID, this._userName, authState);

        } catch (e) {

            // https://github.com/atom/node-keytar/issues/127
            console.log(typeof e);
            console.log(e);
            console.log(e.message);
            if (e.message && e.message.indexOf && e.message.indexOf('already exists') !== -1) {

                console.log('retrying');
                await KeyTar.deletePassword(APP_STORAGE_ID, this._userName);
                await KeyTar.setPassword(APP_STORAGE_ID, this._userName, authState);
                console.log('retry worked');
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
     * Cached user name
     */
    private static _userName: string;
}
