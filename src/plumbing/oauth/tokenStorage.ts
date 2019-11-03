import * as AppAuth from '@openid/appauth';
import * as KeyTar from 'keytar';
import * as OperatingSystemUserName from 'username';

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
    public static async load(): Promise<AppAuth.TokenResponse|null> {

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
        const tokenJson = JSON.parse(authState) as AppAuth.TokenResponseJson;
        return new AppAuth.TokenResponse(tokenJson);
    }

    /*
     * Save token data after login
     */
    public static async save(data: AppAuth.TokenResponse): Promise<void> {

         // Work around the Windows limitation below by shortening the data to prevent a 'Stub received bad data' error
        // https://github.com/atom/node-keytar/issues/112
        const clone = new AppAuth.TokenResponse(data.toJson());
        clone.accessToken = '';
        clone.idToken = '';

        // Convert the object to text
        const authState = JSON.stringify(clone.toJson());

        // Save token data to secure storage
        await KeyTar.setPassword(APP_STORAGE_ID, this._userName, authState);
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
