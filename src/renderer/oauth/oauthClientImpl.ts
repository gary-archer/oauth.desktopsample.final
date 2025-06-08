import {IpcRendererEvents} from '../ipcRendererEvents';
import {ConcurrentActionHandler} from '../utilities/concurrentActionHandler';
import {OAuthClient} from './oauthClient';

/*
 * The entry point class for OAuth related requests in the renderer process
 */
export class OAuthClientImpl implements OAuthClient {

    private readonly ipcEvents: IpcRendererEvents;
    private readonly concurrencyHandler: ConcurrentActionHandler;

    public constructor(ipcEvents: IpcRendererEvents) {

        this.ipcEvents = ipcEvents;
        this.concurrencyHandler = new ConcurrentActionHandler();
        this.setupCallbacks();
    }

    /*
     * See if currently logged in
     */
    public async isLoggedIn(): Promise<boolean> {
        return await this.ipcEvents.isLoggedIn();
    }

    /*
     * Forward to the main side of the app to perform the login work
     */
    public async login(): Promise<void> {
        await this.ipcEvents.login();
    }

    /*
     * Forward to the main side of the app to perform the logout work
     */
    public async logout(): Promise<void> {
        await this.ipcEvents.logout();
    }

    /*
     * Try to refresh an access token
     */
    public async synchronizedRefresh(): Promise<void> {
        await this.concurrencyHandler.execute(this.performTokenRefresh);
    }

    /*
     * Allow the login state to be cleared when required
     */
    public async clearLoginState(): Promise<void> {
        await this.ipcEvents.clearLoginState();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {
        await this.ipcEvents.expireAccessToken();
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public async expireRefreshToken(): Promise<void> {
        await this.ipcEvents.expireRefreshToken();
    }

    /*
     * Do a token refresh on the main side of the app
     */
    private async performTokenRefresh(): Promise<void> {
        await this.ipcEvents.tokenRefresh();
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.performTokenRefresh = this.performTokenRefresh.bind(this);
    }
}
