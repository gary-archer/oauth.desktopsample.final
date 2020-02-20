import {AuthorizationServiceConfiguration,
        BaseTokenRequestHandler,
        GRANT_TYPE_AUTHORIZATION_CODE,
        GRANT_TYPE_REFRESH_TOKEN,
        StringMap,
        TokenRequest,
        TokenRequestJson} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorHandler} from '../errors/errorHandler';
import {UIError} from '../errors/uiError';
import {CustomRequestor} from './customRequestor';
import {LoginManager} from './login/loginManager';
import {LogoutManager} from './logout/logoutManager';
import {TokenData} from './tokenData';
import {TokenStorage} from './tokenStorage';

/*
 * The entry point class for login and token related requests
 */
export class Authenticator {

    private readonly _oauthConfig: OAuthConfiguration;
    private _tokens: TokenData | null;
    private _metadata: any = null;

    /*
     * Initialise from configuration
     */
    public constructor(oauthConfig: OAuthConfiguration) {
        this._oauthConfig = oauthConfig;
        this._tokens = null;
        this._setupCallbacks();
    }

    /*
     * Clear the current access token when an API call fails, to force getting a new one
     */
    public async clearAccessToken(): Promise<void> {

        if (this._tokens) {
            this._tokens.accessToken = '';
        }
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {

        if (this._tokens) {
            this._tokens.accessToken = 'x' + this._tokens.accessToken + 'x';
            await TokenStorage.save(this._tokens);
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {

        if (this._tokens) {
            this._tokens.refreshToken = 'x' + this._tokens.refreshToken + 'x';
            this._tokens.accessToken = '';
            await TokenStorage.save(this._tokens);
        }
    }

    /*
     * Get an access token and login if required
     */
    public async getAccessToken(): Promise<string> {

        // First load auth state from secure storage if it exists
        if (!this._tokens) {
            this._tokens = await TokenStorage.load();
        }

        // Return the existing token if present
        if (this._tokens && this._tokens.accessToken) {
            return this._tokens.accessToken;
        }

        // Try to use the refresh token to get a new access token
        if (this._tokens && this._tokens.refreshToken) {
            await this._refreshAccessToken();
        }

        // Return the new token if present
        if (this._tokens && this._tokens.accessToken) {
            return this._tokens.accessToken;
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
                new CustomRequestor());
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
     * Implement full logout by clearing tokens and also redirecting to remove the Authorization Server session cookie
     */
    public async startLogout(onCompleted: (error: UIError | null) => void): Promise<void> {

        // First clear tokens from memory and storage
        this._tokens = null;
        await TokenStorage.delete();

        // Start the logout process
        const logout = new LogoutManager(
            this._oauthConfig,
            this._tokens!.idToken!,
            onCompleted);
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
        const requestor = new CustomRequestor();
        const tokenHandler = new BaseTokenRequestHandler(requestor);

        // Perform the authorization code grant exchange
        const tokenResponse = await tokenHandler.performTokenRequest(this._metadata, tokenRequest);

        // Set values from the response
        const newTokenData = {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            refreshToken: tokenResponse.refreshToken,
        } as TokenData;

        // Update tokens in memory and secure storage
        this._tokens = newTokenData;
        await TokenStorage.save(this._tokens);
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async _refreshAccessToken(): Promise<void> {

        // Download metadata from the Authorization server if required
        if (!this._metadata) {
            this._metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                this._oauthConfig.authority,
                new CustomRequestor());
        }

        // Supply the scope for access tokens
        const extras: StringMap = {
            scope: this._oauthConfig.scope,
        };

        // Create the token request
        const requestJson = {
            grant_type: GRANT_TYPE_REFRESH_TOKEN,
            client_id: this._oauthConfig.clientId,
            refresh_token: this._tokens!.refreshToken,
            extras,
        } as TokenRequestJson;
        const tokenRequest = new TokenRequest(requestJson);

        try {

            // Execute the request to send the refresh token and get new tokens
            const requestor = new CustomRequestor();
            const tokenHandler = new BaseTokenRequestHandler(requestor);
            const tokenResponse = await tokenHandler.performTokenRequest(this._metadata, tokenRequest);

            // Set values from the response
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                idToken: tokenResponse.idToken,
                refreshToken: tokenResponse.refreshToken,
            } as TokenData;

            // Maintain existing details if required
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this._tokens!.refreshToken;
            }
            if (!newTokenData.idToken) {
                newTokenData.idToken = this._tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this._tokens = newTokenData;
            await TokenStorage.save(this._tokens);

        } catch (e) {

            if (e.error && e.error === ErrorCodes.refreshTokenExpired) {

                // Handle refresh token expired errors by clearing all token data
                this._tokens = null;

            } else {

                // Report unexpected errors
                throw ErrorHandler.getFromOAuthResponse(e, ErrorCodes.tokenRefreshFailed);
            }
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._swapAuthorizationCodeForTokens = this._swapAuthorizationCodeForTokens.bind(this);
    }
}
