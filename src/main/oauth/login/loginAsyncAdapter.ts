import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    StringMap} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {NodeCrypto} from '../../utilities/nodeCrypto';
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

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
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
        const authorizationRequest = new AuthorizationRequest(requestJson, new NodeCrypto(), true);
        authorizationRequest.extras = extras;

        // Set up PKCE for the redirect
        await authorizationRequest.setupCodeVerifier();

        // Wrap the AppAuth notifier in a promise
        const notifier = new AuthorizationNotifier();
        const promise = new Promise<LoginRedirectResult>((resolve) => {

            notifier.setAuthorizationListener(async (
                request: AuthorizationRequest,
                response: AuthorizationResponse | null,
                error: AuthorizationError | null) => {

                resolve({request, response, error});
            });
        });

        // Spin up the browser and begin the login
        const browserLoginRequestHandler = new BrowserLoginRequestHandler(this._state);
        browserLoginRequestHandler.setAuthorizationNotifier(notifier);
        await browserLoginRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);

        // Wait for the result
        return await promise;
    }
}
