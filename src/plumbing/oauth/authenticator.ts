import * as AppAuth from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {UIError} from '../errors/uiError';
import {BrowserAuthorizationRequestHandler} from './browserAuthorizationRequestHandler';
import {CodeVerifier} from './codeVerifier';
import {CustomSchemeNotifier} from './customSchemeNotifier';
import {LoginEvents} from './loginEvents';
import {TokenRequestor} from './tokenRequestor';
import {TokenStorage} from './tokenStorage';

/*
 * The entry point class for login and token requests
 */
export class Authenticator {

    /*
     * Static class members
     */
    private static _metadata: any = null;

    /*
     * The authenticator deals with logins and tokens and stores them in the auth state
     */
    private readonly _oauthConfig: OAuthConfiguration;
    private _authState: AppAuth.TokenResponse | null;

    /*
     * Class setup
     */
    public constructor(oauthConfig: OAuthConfiguration) {
        this._oauthConfig = oauthConfig;
        this._authState = null;
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
        if (!Authenticator._metadata) {
            Authenticator._metadata = await AppAuth.AuthorizationServiceConfiguration.fetchFromIssuer(
                this._oauthConfig.authority);
        }

        // Supply PKCE parameters for the redirect, which avoids native app vulnerabilities
        const verifier = new CodeVerifier();
        const extras: AppAuth.StringMap = {
            code_challenge: verifier.challenge,
            code_challenge_method: verifier.method,
        };

        // Create the authorization request
        const requestJson = {
            response_type: AppAuth.AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._oauthConfig.clientId,
            redirect_uri: this._oauthConfig.redirectUri,
            scope: this._oauthConfig.scope,
            extras,
        } as AppAuth.AuthorizationRequestJson;
        const authorizationRequest = new AppAuth.AuthorizationRequest(requestJson, new AppAuth.DefaultCrypto(), true);

        // Create events for this login attempt
        const loginEvents = new LoginEvents();

        // Ensure that completion callbacks are correlated to the correct authorization request
        CustomSchemeNotifier.addCorrelationState(authorizationRequest.state, loginEvents);

        // Create an authorization handler that uses the browser
        const authorizationRequestHandler = new BrowserAuthorizationRequestHandler(loginEvents);

        // Use the AppAuth mechanism of a notifier to receive the login result
        const notifier = new AppAuth.AuthorizationNotifier();
        authorizationRequestHandler.setAuthorizationNotifier(notifier);
        notifier.setAuthorizationListener(async (
            request: AppAuth.AuthorizationRequest,
            response: AppAuth.AuthorizationResponse | null,
            error: AppAuth.AuthorizationError | null) => {

                // Now that we've finished with login events, remove the item for this login attempt
                CustomSchemeNotifier.removeCorrelationState(request.state);

                // Try to complete login processing
                const result = await this._handleLoginResponse(request, response, error, verifier.verifier);

                // Call back the desktop UI so that it can navigate or show error details
                onCompleted(result);
        });

        // Start the login
        authorizationRequestHandler.performAuthorizationRequest(Authenticator._metadata, authorizationRequest);
    }

    /*
     * Our 'basic logout' implementation just clears token data
     */
    public async logout(): Promise<void> {

        this._authState = null;
        await TokenStorage.delete();
    }

    /*
     * Handle login response objects
     */
    private async _handleLoginResponse(
        request: AppAuth.AuthorizationRequest,
        response: AppAuth.AuthorizationResponse | null,
        error: AppAuth.AuthorizationError | null,
        codeVerifier: string): Promise<UIError | null> {

        // Phase 1 of login has completed
        if (error) {
            return ErrorHandler.getFromOAuthResponse(error, 'authorization_failed');
        }

        // Check that the response state matches the request state
        if (request.state !== response!.state) {
            return ErrorHandler.getFromInvalidLoginResponseState();
        }

        // Phase 2 of login is to swap the authorization code for tokens
        try {
            await this._swapAuthorizationCodeForTokens(response!.code, codeVerifier);
            return null;
        } catch (e) {
            return ErrorHandler.getFromOAuthResponse(e, 'authorization_code_failed');
        }
    }

    /*
     * Swap the authorizasion code for a refresh token and access token
     */
    private async _swapAuthorizationCodeForTokens(authorizationCode: string, codeVerifier: string): Promise<void> {

        // Supply PKCE parameters for the code exchange and the scope for tokens
        const extras: AppAuth.StringMap = {
            code_verifier: codeVerifier,
        };

        // Create the token request
        const requestJson = {
            grant_type: AppAuth.GRANT_TYPE_AUTHORIZATION_CODE,
            code: authorizationCode,
            redirect_uri: this._oauthConfig.redirectUri,
            client_id: this._oauthConfig.clientId,
            extras,
        } as AppAuth.TokenRequestJson;
        const tokenRequest = new AppAuth.TokenRequest(requestJson);

        // Execute the request to swap the code for tokens
        const requestor = new TokenRequestor();
        const tokenHandler = new AppAuth.BaseTokenRequestHandler(requestor);

        // Perform the authorization code grant exchange
        this._authState = await tokenHandler.performTokenRequest(Authenticator._metadata, tokenRequest);

        // Save to secure storage
        await TokenStorage.save(this._authState);
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async _refreshAccessToken(): Promise<void> {

        // Download metadata from the Authorization server if required
        if (!Authenticator._metadata) {
            Authenticator._metadata = await AppAuth.AuthorizationServiceConfiguration.fetchFromIssuer(
                this._oauthConfig.authority);
        }

        // Supply the scope for access tokens
        const extras: AppAuth.StringMap = {
            scope: this._oauthConfig.scope,
        };

        // Create the token request
        const requestJson = {
            grant_type: AppAuth.GRANT_TYPE_REFRESH_TOKEN,
            client_id: this._oauthConfig.clientId,
            refresh_token: this._authState!.refreshToken,
            extras,
        } as AppAuth.TokenRequestJson;
        const tokenRequest = new AppAuth.TokenRequest(requestJson);

        try {
            // Execute the request to send the refresh token and get new tokens
            const requestor = new TokenRequestor();
            const tokenHandler = new AppAuth.BaseTokenRequestHandler(requestor);
            const newTokenData = await tokenHandler.performTokenRequest(Authenticator._metadata, tokenRequest);

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
}
