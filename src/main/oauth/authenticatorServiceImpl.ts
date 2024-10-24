import {
    AuthorizationRequestResponse,
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    TokenRequest} from '@openid/appauth';
import EventEmitter from 'node:events';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {HttpProxy} from '../utilities/httpProxy';
import {UrlParser} from '../utilities/urlParser';
import {AuthenticatorService} from './authenticatorService';
import {CustomRequestor} from './customRequestor';
import {LoginRequestHandler} from './loginRequestHandler';
import {LoginState} from './loginState';
import {LogoutRequestHandler} from './logoutRequestHandler';
import {TokenData} from './tokenData';
import {TokenStorage} from './tokenStorage';

/*
 * The entry point class for OAuth related requests in the main process
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class AuthenticatorServiceImpl implements AuthenticatorService {

    private readonly configuration: OAuthConfiguration;
    private readonly customRequestor: CustomRequestor;
    private readonly loginState: LoginState;
    private readonly eventEmitter: EventEmitter;
    private tokenStorage: TokenStorage | null;
    private tokens: TokenData | null;
    private metadata: AuthorizationServiceConfiguration | null;

    public constructor(configuration: OAuthConfiguration, httpProxy: HttpProxy) {

        this.configuration = configuration;
        this.customRequestor = new CustomRequestor(httpProxy);
        this.loginState = new LoginState();
        this.eventEmitter = new EventEmitter();
        this.tokenStorage = null;
        this.tokens = null;
        this.metadata = null;
        this.setupCallbacks();
    }

    /*
     * Use safe storage to load tokens once the window has initialised
     */
    public initialise(): void {
        this.tokenStorage = new TokenStorage();
        this.tokens = this.tokenStorage.load();
    }

    /*
     * Return true if there are existing tokens
     */
    public async isLoggedIn(): Promise<boolean> {
        return !!this.tokens;
    }

    /*
     * Provide the user info endpoint to the fetch client
     */
    public async getUserInfoEndpoint(): Promise<string | null> {

        await this.loadMetadata();
        return this.metadata?.userInfoEndpoint || null;
    }

    /*
     * Try to get an access token
     */
    public getAccessToken(): string | null {

        // Return the existing token if present
        if (this.tokens && this.tokens.accessToken) {
            return this.tokens.accessToken;
        }

        // Indicate no access token
        return null;
    }

    /*
     * Try to refresh tokens
     */
    public async tokenRefresh(): Promise<void> {

        if (this.tokens && this.tokens.refreshToken) {
            await this.performTokenRefresh();
        }

        if (!this.tokens || !this.tokens.accessToken) {
            throw ErrorFactory.fromLoginRequired();
        }
    }

    /*
     * Do the login work
     */
    public async login(): Promise<void> {

        const result = await this.startLogin();
        if (result.error) {
            throw ErrorFactory.fromLoginOperation(result.error, ErrorCodes.loginResponseFailed);
        }

        await this.endLogin(result);
    }

    /*
     * Implement full logout by clearing tokens and also redirecting to remove the authorization server session cookie
     */
    public async logout(): Promise<void> {

        if (!this.tokens || !this.tokens.idToken) {
            return;
        }

        try {

            // Initialise if required
            await this.loadMetadata();

            // Reset state
            const idToken = this.tokens.idToken;
            this.clearLoginState();

            // Start the logout redirect to remove the authorization server's session cookie
            const handler = new LogoutRequestHandler(
                this.configuration,
                this.metadata!,
                idToken,
                this.eventEmitter);

            await handler.execute();

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

                this.eventEmitter.emit('LOGIN_COMPLETE', args);
                return true;

            } else if (path === '/logoutcallback') {

                this.eventEmitter.emit('LOGOUT_COMPLETE', args);
                return true;
            }
        }

        return false;
    }

    /*
     * Allow the login state to be cleared when required
     */
    public clearLoginState(): void {
        this.tokens = null;
        this.tokenStorage?.delete();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public expireAccessToken(): void {

        if (this.tokens && this.tokens.accessToken) {

            this.tokens.accessToken = `${this.tokens.accessToken}x`;
            this.tokenStorage?.save(this.tokens);
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public expireRefreshToken(): void {

        if (this.tokens && this.tokens.refreshToken) {

            this.tokens.accessToken = `${this.tokens.accessToken}x`;
            this.tokens.refreshToken = `${this.tokens.refreshToken}x`;
            this.tokenStorage?.save(this.tokens);
        }
    }

    /*
     * Load metadata if not already loaded
     */
    private async loadMetadata() {

        if (!this.metadata) {

            try {

                this.metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                    this.configuration.authority,
                    this.customRequestor);

            } catch (e: any) {

                // Do error translation if required
                throw ErrorFactory.fromHttpError(e, this.configuration.authority, 'authorization server');
            }
        }
    }

    /*
     * Start the login on the system browser
     */
    private async startLogin(): Promise<AuthorizationRequestResponse> {

        try {

            // Initialise if required
            await this.loadMetadata();

            // Run a login on the system browser and get the result
            const handler = new LoginRequestHandler(
                this.configuration,
                this.metadata!,
                this.loginState,
                this.eventEmitter);
            return await handler.execute();

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorization code for tokens
     */
    private async endLogin(result: AuthorizationRequestResponse): Promise<void> {

        try {

            // Create the token request including the PKCE code verifier
            const requestJson = {
                grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                code: result.response!.code,
                redirect_uri: this.configuration.redirectUri,
                client_id: this.configuration.clientId,
                extras: {
                    code_verifier: result.request.internal!['code_verifier'],
                },
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to swap the code for tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this.customRequestor);

            // Perform the authorization code grant exchange
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this.metadata!, tokenRequest);

            // Set values from the response
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Update tokens in memory and secure storage
            this.tokens = newTokenData;
            this.tokenStorage?.save(this.tokens);

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Try to use the refresh token to get a new access token
     */
    private async performTokenRefresh(): Promise<void> {

        try {

            // Initialise if required
            await this.loadMetadata();

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                client_id: this.configuration.clientId,
                refresh_token: this.tokens!.refreshToken!,
                redirect_uri: '',
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to send the refresh token and get new tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this.customRequestor);
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this.metadata!, tokenRequest);

            // Set values from the response, which may include a new rolling refresh token
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Maintain the existing refresh token if a new one is not issued
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this.tokens!.refreshToken;
            }

            // Maintain the existing ID token if a new one is not issued
            if (!newTokenData.idToken) {
                newTokenData.idToken = this.tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this.tokens = newTokenData;
            this.tokenStorage?.save(this.tokens);

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
    private setupCallbacks() {
        this.endLogin = this.endLogin.bind(this);
    }
}
