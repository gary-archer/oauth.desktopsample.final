import {RendererEvents} from '../ipc/rendererEvents';
import {ConcurrentActionHandler} from '../utilities/concurrentActionHandler';
import {AuthenticatorClient} from './authenticatorClient';

/*
 * The entry point class for OAuth related requests in the renderer process
 */
export class AuthenticatorClientImpl implements AuthenticatorClient {

    private readonly _events: RendererEvents;
    private readonly _concurrencyHandler: ConcurrentActionHandler;

    public constructor(events: RendererEvents) {

        this._events = events;
        this._concurrencyHandler = new ConcurrentActionHandler();
        this._setupCallbacks();
    }

    /*
     * Forward to the main side of the app to perform the login work
     */
    public async login(): Promise<void> {
        await this._events.login();
    }

    /*
     * Forward to the main side of the app to perform the logout work
     */
    public async logout(): Promise<void> {
        await this._events.logout();
    }

    /*
     * Try to refresh an access token
     */
    public async synchronizedRefresh(): Promise<void> {
        await this._concurrencyHandler.execute(this._performTokenRefresh);
    }

    /*
     * Allow the login state to be cleared when required
     */
    public async clearLoginState(): Promise<void> {
        await this._events.clearLoginState();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {
        await this._events.expireAccessToken();
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {
        await this._events.expireRefreshToken();
    }

    /*
     * Do a token refresh on the main side of the app
     */
    private async _performTokenRefresh(): Promise<void> {
        await this._events.tokenRefresh();
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._performTokenRefresh = this._performTokenRefresh.bind(this);
    }
}
