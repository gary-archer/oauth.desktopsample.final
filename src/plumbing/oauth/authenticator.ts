import {AuthorizationServiceConfiguration,
        BaseTokenRequestHandler,
        FetchRequestor,
        GRANT_TYPE_AUTHORIZATION_CODE,
        GRANT_TYPE_REFRESH_TOKEN,
        StringMap,
        TokenRequest,
        TokenRequestJson,
        TokenResponse} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {UIError} from '../errors/uiError';
import {LoginManager} from './login/loginManager';
import {LogoutManager} from './logout/logoutManager';
import {TokenStorage} from './utilities/tokenStorage';

/*
 * The entry point class for login and token related requests
 */
export class Authenticator {

    /*
     * Store configuration and tokens globally
     */
    private readonly _oauthConfig: OAuthConfiguration;
    private _authState: TokenResponse | null;
    private _metadata: any = null;

    /*
     * Construct at startup from configuration
     */
    public constructor(oauthConfig: OAuthConfiguration) {
        this._oauthConfig = oauthConfig;
        this._authState = null;
        this._setupCallbacks();
    }

    /*
     * Clear the current access token from storage when an API call fails, to force getting a new one
     */
    public async clearAccessToken(): Promise<void> {

        if (this._authState) {
            (this._authState.accessToken as any) = null;
        }
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {

        if (this._authState) {
            this._authState.accessToken = 'x' + this._authState.accessToken + 'x';
            await TokenStorage.save(this._authState);
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {

        if (this._authState) {
            this._authState.refreshToken = 'x' + this._authState.refreshToken + 'x';
            this._authState.accessToken = '';
            await TokenStorage.save(this._authState);
        }
    }

    /*
     * Get an access token and login if required
     */
    public async getAccessToken(): Promise<string> {

        // First load auth state from secure storage if it exists
        if (!this._authState) {
            this._authState = await TokenStorage.load();
        }

        // Return the existing token if present
        if (this._authState && this._authState.accessToken) {
            return this._authState.accessToken;
        }

        // Try to use the refresh token to get a new access token
        if (this._authState && this._authState.refreshToken) {
            await this._refreshAccessToken();
        }

        // Return the new token if present
        if (this._authState && this._authState.accessToken) {
            return this._authState.accessToken;
        }

        // Ensure that API calls without a token are short circuited
        throw ErrorHandler.getFromLoginRequired();
    }

    /*
     * Begin an authorization redirect when the user clicks the Sign In button
     */
    public async startLogin(onCompleted: (error: UIError | null) => void): Promise<void> {

        // Download metadata from the Authorization server if required
        if (!this._metadata) {
            this._metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                this._oauthConfig.authority,
                new FetchRequestor());
        }

        // Start the login process
        const login = new LoginManager(
            this._oauthConfig,
            this._metadata,
            this._swapAuthorizationCodeForTokens,
            onCompleted);
        await login.start();
    }

    /*
     * Implement logout in a custom manner
     */
    public async startLogout(): Promise<void> {

        // Start the logout process
        const logout = new LogoutManager(
            this._oauthConfig,
            this._metadata,
            this._onLogoutComplete);
        await logout.start();
    }

    /*
     * Swap the authorizasion code for a refresh token and access token
     */
    private async _swapAuthorizationCodeForTokens(authorizationCode: string, codeVerifier: string): Promise<void> {

        // Supply PKCE parameters for the code exchange
        const extras: StringMap = {
            code_verifier: codeVerifier,
        };

        // Create the token request
        const requestJson = {
            grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
            code: authorizationCode,
            redirect_uri: this._oauthConfig.redirectUri,
            client_id: this._oauthConfig.clientId,
            extras,
        } as TokenRequestJson;
        const tokenRequest = new TokenRequest(requestJson);

        // Execute the request to swap the code for tokens
        const requestor = new FetchRequestor();
        const tokenHandler = new BaseTokenRequestHandler(requestor);

        // Perform the authorization code grant exchange
        this._authState = await tokenHandler.performTokenRequest(this._metadata, tokenRequest);

        // Save to secure storage
        await TokenStorage.save(this._authState);
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async _refreshAccessToken(): Promise<void> {

        // Download metadata from the Authorization server if required
        if (!this._metadata) {
            this._metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                this._oauthConfig.authority,
                new FetchRequestor());
        }

        // Supply the scope for access tokens
        const extras: StringMap = {
            scope: this._oauthConfig.scope,
        };

        // Create the token request
        const requestJson = {
            grant_type: GRANT_TYPE_REFRESH_TOKEN,
            client_id: this._oauthConfig.clientId,
            refresh_token: this._authState!.refreshToken,
            extras,
        } as TokenRequestJson;
        const tokenRequest = new TokenRequest(requestJson);

        try {

            // Execute the request to send the refresh token and get new tokens
            const requestor = new FetchRequestor();
            const tokenHandler = new BaseTokenRequestHandler(requestor);
            const newTokenData = await tokenHandler.performTokenRequest(this._metadata, tokenRequest);

            // Maintain the refresh token if we did not receive a new 'rolling' refresh token
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this._authState!.refreshToken;
            }

            // Update tokens in memory and secure storage
            this._authState = newTokenData;
            await TokenStorage.save(this._authState);

        } catch (e) {

            if (e.error && e.error === 'invalid_grant') {

                // Handle refresh token expired errors by clearing all token data
                this._authState = null;
            } else {

                // Report unexpected errors
                throw ErrorHandler.getFromOAuthResponse(e, 'refresh_token_failed');
            }
        }
    }

    /*
     * Handle the response from logging out
     */
    private async _onLogoutComplete(error: UIError | null) {

        if (!error) {
            this._authState = null;
            await TokenStorage.delete();
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._swapAuthorizationCodeForTokens = this._swapAuthorizationCodeForTokens.bind(this);
    }
}
