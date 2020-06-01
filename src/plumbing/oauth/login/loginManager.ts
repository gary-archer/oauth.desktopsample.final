import {AuthorizationError,
        AuthorizationNotifier,
        AuthorizationRequest,
        AuthorizationRequestJson,
        AuthorizationResponse,
        AuthorizationServiceConfiguration,
        DefaultCrypto} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {ErrorCodes} from '../../errors/errorCodes';
import {ErrorHandler} from '../../errors/errorHandler';
import {RendererEvents} from '../../events/rendererEvents';
import {BrowserLoginRequestHandler} from './browserLoginRequestHandler';
import {LoginState} from './loginState';

/*
 * A class to handle the plumbing of login redirects via the system browser
 */
export class LoginManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;
    private readonly _events: RendererEvents;
    private readonly _onCodeReceived: (code: string, verifier: string) => void;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState,
        events: RendererEvents,
        onCodeReceived: (code: string, verifier: string) => void) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._events = events;
        this._onCodeReceived = onCodeReceived;
    }

    /*
     * Start the login redirect and listen for the response
     */
    public async login(): Promise<void> {

        return new Promise<void>(async (resolve, reject) => {

            try {
                await this._startLogin(resolve, reject);
            } catch (e) {
                reject(e);
            }
        });
    }

    /*
     * Do the work of the login redirect
     */
    private async _startLogin(onSuccess: () => void, onError: (e: any) => void): Promise<void> {

        // Create the authorization request in the AppAuth style
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: this._configuration.redirectUri,
            scope: this._configuration.scope,
        } as AuthorizationRequestJson;
        const authorizationRequest = new AuthorizationRequest(requestJson, new DefaultCrypto(), true);

        // Set up PKCE for the redirect, which avoids native app vulnerabilities
        await authorizationRequest.setupCodeVerifier();

        // Use the AppAuth mechanism of a notifier to receive the login result
        const notifier = new AuthorizationNotifier();
        notifier.setAuthorizationListener(async (
            request: AuthorizationRequest,
            response: AuthorizationResponse | null,
            error: AuthorizationError | null) => {

                // When we receive the result, handle it and complete the callback
                try {
                    await this._handleLoginResponse(request, response, error);
                    onSuccess();
                } catch (e) {
                    onError(e);
                }
        });

        // Start the login on a custom browser handler
        const browserLoginRequestHandler = new BrowserLoginRequestHandler(this._state, this._events);
        browserLoginRequestHandler.setAuthorizationNotifier(notifier);
        browserLoginRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);
    }

    /*
     * Start the second phase of login, to swap the authorization code for tokens
     */
    private async _handleLoginResponse(
        request: AuthorizationRequest,
        response: AuthorizationResponse | null,
        error: AuthorizationError | null): Promise<void> {

        // The first phase of login has completed
        if (error) {
            throw ErrorHandler.getFromLoginResponse(error, ErrorCodes.loginResponseFailed);
        }

        try {
            // Get the PKCE verifier
            const codeVerifierKey = 'code_verifier';
            const codeVerifier = request.internal![codeVerifierKey];

            // Swap the authorization code for tokens
            await this._onCodeReceived(response!.code, codeVerifier);

        } catch (e) {

            throw ErrorHandler.getFromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }
}
