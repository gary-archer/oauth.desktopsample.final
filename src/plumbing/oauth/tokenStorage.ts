import KeyTar from 'keytar';
import OperatingSystemUserName from 'username';
import {TokenData} from './tokenData';

/*
 * A class to store our token data in secure storage
 */
export class TokenStorage {

    // Token storage keys, and we use separate entries due to long Cognito tokens and Windows size limitations
    // The below link describes the Windows limitation that otherwise leads to a 'Stub received bad data' error
    // https://github.com/atom/node-keytar/issues/112
    static readonly ACCESS_TOKEN = 'DesktopSample.AccessToken';
    static readonly REFRESH_TOKEN = 'DesktopSample.AccessToken';
    static readonly ID_TOKEN = 'DesktopSample.IdToken';

    // The current username
    private static _userName: string;

    /*
     * Load token data or return null
     */
    public static async load(): Promise<TokenData | null> {

        // Get the operating system user name on the first call
        if (!TokenStorage._userName) {
            TokenStorage._userName = await OperatingSystemUserName();
        }

        // Look up tokens from secure storage
        const accessToken = await KeyTar.getPassword(this.ACCESS_TOKEN, this._userName);
        const refreshToken = await KeyTar.getPassword(this.REFRESH_TOKEN, this._userName);
        const idToken = await KeyTar.getPassword(this.ID_TOKEN, this._userName);
        if (!accessToken || !refreshToken || !idToken) {
            return null;
        }

        // Convert to our token data object
        return {
            accessToken,
            refreshToken,
            idToken,
        };
    }

    /*
     * Save token data after login
     */
    public static async save(data: TokenData): Promise<void> {

        await KeyTar.setPassword(this.ACCESS_TOKEN, this._userName, data.accessToken!);
        await KeyTar.setPassword(this.REFRESH_TOKEN, this._userName, data.refreshToken!);
        await KeyTar.setPassword(this.ID_TOKEN, this._userName, data.idToken!);
    }

    /*
     * Delete token data after logout
     */
    public static async delete(): Promise<void> {

        await KeyTar.deletePassword(this.ACCESS_TOKEN, this._userName);
        await KeyTar.deletePassword(this.REFRESH_TOKEN, this._userName);
        await KeyTar.deletePassword(this.ID_TOKEN, this._userName);
    }
}
