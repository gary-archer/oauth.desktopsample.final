import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {RendererEvents} from '../ipc/rendererEvents';
import {ConcurrentActionHandler} from '../utilities/concurrentActionHandler';
import {AuthenticatorClient} from './authenticatorClient';

/*
 * The entry point class for OAuth related requests in the renderer process
 */
export class AuthenticatorClientImpl implements AuthenticatorClient {

    private readonly _events: RendererEvents;
    private readonly _concurrencyHandler: ConcurrentActionHandler;
    private _isLoading: boolean;
    private _isLoaded: boolean;

    public constructor(configuration: OAuthConfiguration, events: RendererEvents) {

        // Initialise properties
        this._events = events;
        this._concurrencyHandler = new ConcurrentActionHandler();
        this._isLoading = false;
        this._isLoaded = false;
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

        // TODO: use concurrency handler
        // await this._concurrencyHandler.execute(this._performTokenRefresh);

        // TODO: handle the case where there are no unexpected errors but token refresh fails
        // throw ErrorFactory.fromLoginRequired();
    }

    /*
     * Allow the login state to be cleared when required
     */
    public async clearLoginState(): Promise<void> {

        // TODO: remote call
        // this._tokens = null;
        // await this._events.deleteTokens();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {

        // TODO: remote call
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {

        // TODO: remote call
    }

    /*
     * Initialize the app upon startup, or retry if the initial load fails
     * The loading flag prevents duplicate metadata requests due to React strict mode
     */
    private async _initialise(): Promise<void> {

        // TODO: I can probably delete this */
        /*if (!this._isLoaded && !this._isLoading) {

            this._isLoading = true;

            try {

                await this._loadMetadata();
                this._tokens = await this._events.loadTokens();
                this._isLoaded = true;

            } finally {

                this._isLoading = false;
            }
        }*/
    }
}
