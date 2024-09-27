import {
    AuthorizationError,
    AuthorizationRequest,
    AuthorizationRequestHandler,
    AuthorizationRequestResponse,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    BasicQueryStringUtils} from '@openid/appauth';
import open from 'open';
import {NodeCrypto} from '../../utilities/nodeCrypto';
import {LoginState} from './loginState';

/*
 * Adapts old style AppAuth-JS callbacks to a modern async await syntax
 */
export class BrowserLoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _state: LoginState;
    private _response: AuthorizationRequestResponse | null;

    public constructor(state: LoginState) {

        super(new BasicQueryStringUtils(), new NodeCrypto());
        this._state = state;
        this._response = null;
    }

    /*
     * Make the login request on the system browser and handle the response
     */
    public async performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): Promise<void> {

        // Create a callback to handle the response when a deep link is received
        const callback = async (args: URLSearchParams | null) => {

            if (args) {
                this._response = this._handleBrowserLoginResponse(args, request);
                super.completeAuthorizationRequestIfPossible();
            }
        };

        // Store the callback mapped to the OAuth state parameter
        this._state.storeLoginCallback(request.state, callback);

        // Form the authorization request using the AppAuth base class and open the system browser there
        await open(this.buildRequestUrl(metadata, request));
    }

    /*
     * Return the response as required by the base class
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {
        return this._response;
    }

    /*
     * Collect response data using AppAuth objects
     */
    private _handleBrowserLoginResponse(
        args: URLSearchParams,
        request: AuthorizationRequest): AuthorizationRequestResponse {

        // Get strongly typed fields
        const state = args.get('state') || '';
        const code = args.get('code') || '';
        const error = args.get('error') || '';

        // Initialise the result
        let authorizationResponse: AuthorizationResponse | null = null;
        let authorizationError: AuthorizationError | null = null;

        if (error) {

            // Handle error responses if required
            const errorDescription = args.get('error_description') || '';
            const errorJson = {
                error,
                error_description: errorDescription || '',
            };
            authorizationError = new AuthorizationError(errorJson);

        } else {

            // Create a success response containing the code, which we will next swap for tokens
            const responseJson = {
                code,
                state,
            };
            authorizationResponse = new AuthorizationResponse(responseJson);
        }

        // Return the full authorization response data
        return {
            request,
            response: authorizationResponse,
            error: authorizationError,
        };
    }
}
