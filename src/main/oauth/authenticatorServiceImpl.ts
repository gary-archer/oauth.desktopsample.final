import {
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    StringMap,
    TokenRequest} from '@openid/appauth';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {HttpProxy} from '../utilities/httpProxy';
import {UrlParser} from '../utilities/urlParser';
import {AuthenticatorService} from './authenticatorService';
import {CustomRequestor} from './customRequestor';
import {LoginAsyncAdapter} from './login/loginAsyncAdapter';
import {LoginRedirectResult} from './login/loginRedirectResult';
import {LoginState} from './login/loginState';
import {LogoutManager} from './logout/logoutManager';
import {LogoutState} from './logout/logoutState';
import {TokenData} from './tokenData';
import {TokenStorage} from './tokenStorage';

/*
 * The entry point class for OAuth related requests in the main process
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class AuthenticatorServiceImpl implements AuthenticatorService {

    private readonly _configuration: OAuthConfiguration;
    private readonly _customRequestor: CustomRequestor;
    private readonly _loginState: LoginState;
    private readonly _logoutState: LogoutState;
    private _tokenStorage: TokenStorage | null;
    private _tokens: TokenData | null;
    private _metadata: AuthorizationServiceConfiguration | null;

    public constructor(configuration: OAuthConfiguration, httpProxy: HttpProxy) {

        this._configuration = configuration;
        this._customRequestor = new CustomRequestor(httpProxy);
        this._loginState = new LoginState();
        this._logoutState = new LogoutState();
        this._tokenStorage = null;
        this._tokens = null;
        this._metadata = null;
        this._setupCallbacks();
    }

    /*
     * Use safe storage to load tokens once the window has initialised
     */
    public initialise(): void {
        this._tokenStorage = new TokenStorage();
        this._tokens = this._tokenStorage.load();
    }

    /*
     * Return true if there are existing tokens
     */
    public async isLoggedIn(): Promise<boolean> {
        return !!this._tokens;
    }

    /*
     * Provide the user info endpoint to the fetch client
     */
    public async getUserInfoEndpoint(): Promise<string | null> {

        await this._loadMetadata();
        return this._metadata?.userInfoEndpoint || null;
    }

    /*
     * Try to get an access token
     */
    public getAccessToken(): string | null {

        // Return the existing token if present
        if (this._tokens && this._tokens.accessToken) {
            return this._tokens.accessToken;
        }

        // Indicate no access token
        return null;
    }

    /*
     * Try to refresh tokens
     */
    public async tokenRefresh(): Promise<void> {

        if (this._tokens && this._tokens.refreshToken) {
            await this._performTokenRefresh();
        }

        if (!this._tokens || !this._tokens.accessToken) {
            throw ErrorFactory.fromLoginRequired();
        }
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
     * Implement full logout by clearing tokens and also redirecting to remove the authorization server session cookie
     */
    public async logout(): Promise<void> {

        try {

            if (this._tokens && this._tokens.idToken) {

                // Initialise if required
                await this._loadMetadata();

                // Reset state
                const idToken = this._tokens.idToken;
                this.clearLoginState();

                // Start the logout redirect to remove the authorization server's session cookie
                const logout = new LogoutManager(
                    this._configuration,
                    this._metadata!,
                    this._logoutState,
                    idToken);
                await logout.start();
            }

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLogoutOperation(e, ErrorCodes.logoutRequestFailed);
        }
    }

    /*
     * This class handles OAuth login and logout responses but not other types of deep link
     */
    public handleDeepLink(deepLinkUrl: string): boolean {

        const url = UrlParser.tryParse(deepLinkUrl);
        if (url) {

            const args = new URLSearchParams(url.search);
            const path = url.pathname.toLowerCase();
            if (path === '/callback') {

                this._loginState!.handleLoginResponse(args);
                return true;

            } else if (path === '/logoutcallback') {

                this._logoutState!.handleLogoutResponse(args);
                return true;
            }
        }

        return false;
    }

    /*
     * Allow the login state to be cleared when required
     */
    public clearLoginState(): void {
        this._tokens = null;
        this._tokenStorage?.delete();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public expireAccessToken(): void {

        if (this._tokens && this._tokens.accessToken) {

            this._tokens.accessToken = `${this._tokens.accessToken}x`;
            this._tokenStorage?.save(this._tokens);
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public expireRefreshToken(): void {

        if (this._tokens && this._tokens.refreshToken) {

            this._tokens.accessToken = `${this._tokens.accessToken}x`;
            this._tokens.refreshToken = `${this._tokens.refreshToken}x`;
            this._tokenStorage?.save(this._tokens);
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
                    this._customRequestor);

            } catch (e: any) {

                // Do error translation if required
                throw ErrorFactory.fromHttpError(e, this._configuration.authority, 'authorization server');
            }
        }
    }

    /*
     * Start the login on the system browser
     */
    private async _startLogin(): Promise<LoginRedirectResult> {

        try {

            // Initialise if required
            await this._loadMetadata();

            // Run a login on the system browser and get the result
            const adapter = new LoginAsyncAdapter(
                this._configuration,
                this._metadata!,
                this._loginState);

            return await adapter.login();

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorization code for tokens
     */
    private async _endLogin(result: LoginRedirectResult): Promise<void> {

        try {

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
            const tokenRequestHandler = new BaseTokenRequestHandler(this._customRequestor);

            // Perform the authorization code grant exchange
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this._metadata!, tokenRequest);

            // Set values from the response
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Update tokens in memory and secure storage
            this._tokens = newTokenData;
            this._tokenStorage?.save(this._tokens);

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async _performTokenRefresh(): Promise<void> {

        try {

            // Initialise if required
            await this._loadMetadata();

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
            const tokenRequestHandler = new BaseTokenRequestHandler(this._customRequestor);
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this._metadata!, tokenRequest);

            // Set values from the response, which may include a new rolling refresh token
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Maintain the existing refresh token if a new one is not issued
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this._tokens!.refreshToken;
            }

            // Maintain the existing ID token if a new one is not issued
            if (!newTokenData.idToken) {
                newTokenData.idToken = this._tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this._tokens = newTokenData;
            this._tokenStorage?.save(this._tokens);

        } catch (e: any) {

            if (e.error === ErrorCodes.refreshTokenExpired) {

                // For invalid_grant errors, clear token data and return success, to force a login redirect
                this.clearLoginState();

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
    }
}
