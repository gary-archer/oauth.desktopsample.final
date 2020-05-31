import {AuthorizationError,
        AuthorizationErrorJson,
        AuthorizationRequest,
        AuthorizationRequestHandler,
        AuthorizationRequestResponse,
        AuthorizationResponse,
        AuthorizationResponseJson,
        AuthorizationServiceConfiguration,
        BasicQueryStringUtils,
        DefaultCrypto} from '@openid/appauth';
// import Opener from 'opener';
import {LoginState} from './loginState';

/*
 * An override of the default authorization handler
 */
export class BrowserLoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _state: LoginState;
    private _authorizationPromise: Promise<AuthorizationRequestResponse> | null;

    public constructor(state: LoginState) {

        super(new BasicQueryStringUtils(), new DefaultCrypto());
        this._state = state;
        this._authorizationPromise = null;
    }

    /*
     * Use the AppAuth class to form the OAuth URL, then make the login request on the system browser
     */
    public performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): void {

        // Create a promise to receive the response from the browser
        this._authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {

            // Form the OAuth request using AppAuth libraries
            const loginUrl = this.buildRequestUrl(metadata, request);

            // Create a callback to wait for completion
            const callback = (queryParams: any) => {

                // Package up data into an object and then resolve our promise
                const response = this._handleBrowserLoginResponse(queryParams, request);
                resolve(response);

                // Ask the base class to call our completeAuthorizationRequest
                this.completeAuthorizationRequestIfPossible();
            };

            // Store login state so that we can receive the response
            this._state.storeLoginCallback(request.state, callback);

            // GJA
            // Invoke the browser
            // Opener(loginUrl);
        });
    }

    /*
     * Return data back to the authenticator's notifier
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {

        return this._authorizationPromise;
    }

    /*
     * Collect response data using AppAuth objects
     */
    private _handleBrowserLoginResponse(
        queryParams: any,
        request: AuthorizationRequest): AuthorizationRequestResponse {

        // Get strongly typed fields
        const authFields = queryParams as (AuthorizationResponseJson & AuthorizationErrorJson);

        // Initialize the result
        let authorizationResponse: AuthorizationResponse | null = null;
        let authorizationError: AuthorizationError | null = null;

        // Process the login response message
        const state = authFields.state;
        const code = authFields.code;
        const error = authFields.error;

        if (error) {

            // Handle error responses if required
            const errorUri = authFields.error_uri;
            const errorDescription = authFields.error_description;

            const errorJson = {
                error,
                error_description: errorDescription,
                error_uri: errorUri,
                state,
            } as AuthorizationErrorJson;
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
        } as AuthorizationRequestResponse;
    }
}
