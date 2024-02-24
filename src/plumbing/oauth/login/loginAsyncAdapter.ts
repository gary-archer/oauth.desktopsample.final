import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    DefaultCrypto,
    StringMap} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {RendererEvents} from '../../ipc/rendererEvents';
import {BrowserLoginRequestHandler} from './browserLoginRequestHandler';
import {LoginRedirectResult} from './loginRedirectResult';
import {LoginState} from './loginState';

/*
 * The AppAuth-JS class uses some old Node.js style callbacks
 * This class adapts them to a modern async await syntax
 */
export class LoginAsyncAdapter {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;
    private readonly _events: RendererEvents;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState,
        events: RendererEvents) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._events = events;
    }

    /*
     * Start the login redirect and listen for the response
     */
    public async login(): Promise<LoginRedirectResult> {

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
                    resolve({request, response, error});

                } catch (e: any) {
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
}
