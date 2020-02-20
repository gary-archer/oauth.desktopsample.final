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
import Opener from 'opener';
import {RedirectEvents} from '../utilities/redirectEvents';

/*
 * An override of the default authorization handler to perform a login
 */
export class LoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _redirectEvents: RedirectEvents;
    private _authorizationPromise: Promise<AuthorizationRequestResponse> | null;

    public constructor(redirectEvents: RedirectEvents) {

        super(new BasicQueryStringUtils(), new DefaultCrypto());
        this._redirectEvents = redirectEvents;
        this._authorizationPromise = null;
    }

    /*
     * Use the AppAuth class to form the OAuth URL, then make the login request on the system browser
     */
    public performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): void {

        // Form the OAuth request
        const oauthUrl = this.buildRequestUrl(metadata, request);

        // Create a promise to handle the response from the browser
        this._authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {

            // Wait for a response event from the system
            this._redirectEvents.once(RedirectEvents.ON_AUTHORIZATION_RESPONSE, (queryParams: any) => {

                // Package up data into an object and then resolve our promise
                const completeResponse = this._handleBrowserLoginResponse(queryParams, request);
                resolve(completeResponse);

                // Ask the base class to call our completeAuthorizationRequest
                this.completeAuthorizationRequestIfPossible();
            });
        });

        // Invoke the browser
        Opener(oauthUrl);
    }

    /*
     * Return data back to the authenticator's notifier
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {

        return this._authorizationPromise;
    }

    /*
     * Collect response data to return to the caller
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
