import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    DefaultCrypto,
    StringMap} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {ErrorCodes} from '../../errors/errorCodes';
import {ErrorFactory} from '../../errors/errorFactory';
import {RendererEvents} from '../../ipc/rendererEvents';
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
    private readonly _onCodeReceived: (code: string, verifier: string) => Promise<void>;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState,
        events: RendererEvents,
        onCodeReceived: (code: string, verifier: string) => Promise<void>) {

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

        // Create the authorization request as a JSON object
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: this._configuration.redirectUri,
            scope: this._configuration.scope,
        };

        // Other parameters such as acr_values could be supplied here
        const extras: StringMap = {
        };

        // Create the authorization request message
        const authorizationRequest = new AuthorizationRequest(requestJson, new DefaultCrypto(), true);
        authorizationRequest.extras = extras;

        // Set up PKCE for the redirect, which avoids native app vulnerabilities
        await authorizationRequest.setupCodeVerifier();

        /* eslint-disable no-async-promise-executor */
        return new Promise(async (resolve, reject) => {

            // Use the AppAuth mechanism of a notifier to receive the login result
            const notifier = new AuthorizationNotifier();
            notifier.setAuthorizationListener(async (
                request: AuthorizationRequest,
                response: AuthorizationResponse | null,
                error: AuthorizationError | null) => {

                try {
                    // When we receive the result, handle it and complete the callback
                    await this._handleLoginResponse(request, response, error);
                    resolve();

                } catch (e) {

                    // Handle any errors in the async block
                    reject(e);
                }
            });

            try {

                // Create a custom browser handler and try to start a login
                const browserLoginRequestHandler = new BrowserLoginRequestHandler(this._state, this._events);
                browserLoginRequestHandler.setAuthorizationNotifier(notifier);
                await browserLoginRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);

            } catch (e: any) {

                // Report errors correctly from the above async call
                reject(e);
            }
        });
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
            throw ErrorFactory.fromLoginOperation(error, ErrorCodes.loginResponseFailed);
        }

        try {
            // Get the PKCE verifier
            const codeVerifierKey = 'code_verifier';
            const codeVerifier = request.internal![codeVerifierKey];

            // Swap the authorization code for tokens
            await this._onCodeReceived(response!.code, codeVerifier);

        } catch (e) {

            // Handle any error conditions
            throw ErrorFactory.fromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }
}
