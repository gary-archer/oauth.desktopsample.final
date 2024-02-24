import {
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    StringMap,
    TokenRequest} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorFactory} from '../errors/errorFactory';
import {RendererEvents} from '../ipc/rendererEvents';
import {ConcurrentActionHandler} from '../utilities/concurrentActionHandler';
import {Authenticator} from './authenticator';
import {CustomRequestor} from './customRequestor';
import {LoginAsyncAdapter} from './login/loginAsyncAdapter';
import {LoginRedirectResult} from './login/loginRedirectResult';
import {LoginState} from './login/loginState';
import {LogoutManager} from './logout/logoutManager';
import {LogoutState} from './logout/logoutState';
import {TokenData} from './tokenData';

/*
 * The entry point class for login and token related requests
 */
export class AuthenticatorImpl implements Authenticator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _events: RendererEvents;
    private readonly _concurrencyHandler: ConcurrentActionHandler;
    private readonly _loginState: LoginState;
    private readonly _logoutState: LogoutState;
    private _metadata: AuthorizationServiceConfiguration | null;
    private _tokens: TokenData | null;
    private _isLoading: boolean;
    private _isLoaded: boolean;

    public constructor(configuration: OAuthConfiguration, events: RendererEvents) {

        // Initialise properties
        this._configuration = configuration;
        this._metadata = null;
        this._events = events;
        this._concurrencyHandler = new ConcurrentActionHandler();
        this._tokens = null;
        this._isLoading = false;
        this._isLoaded = false;
        this._setupCallbacks();

        // Initialise state, used to correlate responses from the system browser to the original request
        this._loginState = new LoginState();
        this._logoutState = new LogoutState();
        this._events.setOAuthDetails(this._loginState, this._logoutState, this._configuration.logoutCallbackPath);
    }

    /*
     * Initialize the app upon startup, or retry if the initial load fails
     * The loading flag prevents duplicate metadata requests due to React strict mode
     */
    public async initialise(): Promise<void> {

        if (!this._isLoaded && !this._isLoading) {

            this._isLoading = true;

            try {

                await this._loadMetadata();
                this._tokens = await this._events.loadTokens();
                this._isLoaded = true;

            } finally {

                this._isLoading = false;
            }
        }
    }

    /*
     * Provide the user info endpoint to the fetch client
     */
    public async getUserInfoEndpoint(): Promise<string | null> {
        return this._metadata?.userInfoEndpoint || null;
    }

    /*
     * Try to get an access token
     */
    public async getAccessToken(): Promise<string | null> {

        // Return the existing token if present
        if (this._tokens && this._tokens.accessToken) {
            return this._tokens.accessToken;
        }

        // Indicate no access token
        return null;
    }

    /*
     * Try to refresh an access token
     */
    public async synchronizedRefresh(): Promise<string> {

        // Try to use the refresh token to get a new access token
        if (this._tokens && this._tokens.refreshToken) {

            // The concurrency handler will only do the refresh work for the first UI view that requests it
            await this._concurrencyHandler.execute(this._performTokenRefresh);

            // Return the new token on success
            if (this._tokens && this._tokens.accessToken) {
                return this._tokens.accessToken;
            }
        }

        // Trigger a login redirect if there are no unexpected errors but we cannot refresh
        throw ErrorFactory.fromLoginRequired();
    }

    /*
     * Do the login work
     */
    public async login(): Promise<void> {

        const result = await this._startLogin();
        if (result.error) {
            throw ErrorFactory.fromLoginOperation(result.error, ErrorCodes.loginResponseFailed);
        }

        await this._endLogin(result);
    }

    /*
     * Implement full logout by clearing tokens and also redirecting to remove the Authorization Server session cookie
     */
    public async logout(): Promise<void> {

        try {

            if (this._tokens && this._tokens.idToken) {

                // Initialise if required
                await this.initialise();

                // Reset state
                const idToken = this._tokens.idToken;
                await this.clearLoginState();

                // Start the logout redirect to remove the authorization server's session cookie
                const logout = new LogoutManager(
                    this._configuration,
                    this._metadata!,
                    this._logoutState,
                    this._events,
                    idToken);
                await logout.start();
            }

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLogoutOperation(e, ErrorCodes.logoutRequestFailed);
        }
    }

    /*
     * Allow the login state to be cleared when required
     */
    public async clearLoginState(): Promise<void> {
        this._tokens = null;
        await this._events.deleteTokens();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {

        if (this._tokens && this._tokens.accessToken) {
            this._tokens.accessToken = `${this._tokens.accessToken}x`;
            await this._events.saveTokens(this._tokens);
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {

        if (this._tokens && this._tokens.refreshToken) {
            this._tokens.accessToken = `${this._tokens.accessToken}x`;
            this._tokens.refreshToken = `${this._tokens.refreshToken}x`;
            await this._events.saveTokens(this._tokens);
        }
    }

    /*
     * Load metadata if not already loaded
     */
    private async _loadMetadata() {

        if (!this._metadata) {

            try {

                this._metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                    this._configuration.authority,
                    new CustomRequestor());

            } catch (e: any) {

                // Do error translation if required
                throw ErrorFactory.fromHttpError(e, this._configuration.authority, 'authorization server');
            }
        }
    }

    /*
     * Do the work of starting a login redirect
     */
    private async _startLogin(): Promise<LoginRedirectResult> {

        try {

            // Initialise if required
            await this.initialise();

            // Run a login on the system browser and get the result
            const loginManager = new LoginAsyncAdapter(
                this._configuration,
                this._metadata!,
                this._loginState,
                this._events);
            return await loginManager.login();

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorizasion code for a refresh token and access token
     */
    private async _endLogin(result: LoginRedirectResult): Promise<void> {

        // Get the PKCE verifier
        const codeVerifier = result.request.internal!['code_verifier'];

        // Supply PKCE parameters for the code exchange
        const extras: StringMap = {
            code_verifier: codeVerifier,
        };

        // Create the token request
        const requestJson = {
            grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
            code: result.response!.code,
            redirect_uri: this._configuration.redirectUri,
            client_id: this._configuration.clientId,
            extras,
        };
        const tokenRequest = new TokenRequest(requestJson);

        // Execute the request to swap the code for tokens
        const requestor = new CustomRequestor();
        const tokenHandler = new BaseTokenRequestHandler(requestor);

        // Perform the authorization code grant exchange
        const tokenResponse = await tokenHandler.performTokenRequest(this._metadata!, tokenRequest);

        // Set values from the response
        const newTokenData = {
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
            idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
        };

        // Update tokens in memory and secure storage
        this._tokens = newTokenData;
        await this._events.saveTokens(this._tokens);
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async _performTokenRefresh(): Promise<void> {

        try {

            // Initialise if required
            await this.initialise();

            // Supply the scope for access tokens
            const extras: StringMap = {
                scope: this._configuration.scope,
            };

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                client_id: this._configuration.clientId,
                refresh_token: this._tokens!.refreshToken!,
                redirect_uri: '',
                extras,
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to send the refresh token and get new tokens
            const requestor = new CustomRequestor();
            const tokenHandler = new BaseTokenRequestHandler(requestor);
            const tokenResponse = await tokenHandler.performTokenRequest(this._metadata!, tokenRequest);

            // Set values from the response, which may include a new rolling refresh token
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Maintain existing details if required
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this._tokens!.refreshToken;
            }
            if (!newTokenData.idToken) {
                newTokenData.idToken = this._tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this._tokens = newTokenData;
            await this._events.saveTokens(this._tokens);

        } catch (e: any) {

            if (e.error === ErrorCodes.refreshTokenExpired) {

                // For invalid_grant errors, clear token data and return success, to force a login redirect
                await this.clearLoginState();

            } else {

                // Rethrow other errors
                throw ErrorFactory.fromTokenError(e, ErrorCodes.tokenRenewalError);
            }
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._endLogin = this._endLogin.bind(this);
        this._performTokenRefresh = this._performTokenRefresh.bind(this);
    }
}
