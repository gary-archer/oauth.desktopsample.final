import {AuthorizationError,
        AuthorizationNotifier,
        AuthorizationRequest,
        AuthorizationRequestJson,
        AuthorizationResponse,
        AuthorizationServiceConfiguration,
        DefaultCrypto,
        StringMap} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {ErrorHandler} from '../../errors/errorHandler';
import {UIError} from '../../errors/uiError';
import {CustomSchemeNotifier} from '../../utilities/customSchemeNotifier';
import {RedirectEvents} from '../utilities/redirectEvents';
import {CodeVerifier} from './codeVerifier';
import {LoginRequestHandler} from './loginRequestHandler';

/*
 * A class to handle the plumbing of login redirects via the system browser
 */
export class LoginManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _onCodeReceived: (code: string, verifier: string) => void;
    private readonly _onComplete: (error: UIError | null) => void;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        onCodeReceived: (code: string, verifier: string) => void,
        onComplete: (error: UIError | null) => void) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._onCodeReceived = onCodeReceived;
        this._onComplete = onComplete;
    }

    public async start(): Promise<void> {

        // Supply PKCE parameters for the redirect, which avoids native app vulnerabilities
        const verifier = new CodeVerifier();
        const extras: StringMap = {
            code_challenge: verifier.challenge,
            code_challenge_method: verifier.method,
        };

        // Create the authorization request
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: this._configuration.redirectUri,
            scope: this._configuration.scope,
            extras,
        } as AuthorizationRequestJson;
        const authorizationRequest = new AuthorizationRequest(requestJson, new DefaultCrypto(), true);

        // Create events for this login attempt
        const loginEvents = new RedirectEvents();

        // Ensure that completion callbacks are correlated to the correct authorization request
        CustomSchemeNotifier.addCorrelationState(authorizationRequest.state, loginEvents);

        // Create an authorization handler that uses the browser
        const authorizationRequestHandler = new LoginRequestHandler(loginEvents);

        // Use the AppAuth mechanism of a notifier to receive the login result
        const notifier = new AuthorizationNotifier();
        authorizationRequestHandler.setAuthorizationNotifier(notifier);
        notifier.setAuthorizationListener(async (
            request: AuthorizationRequest,
            response: AuthorizationResponse | null,
            error: AuthorizationError | null) => {

                // Now that we've finished with login events, remove the item for this login attempt
                CustomSchemeNotifier.removeCorrelationState(request.state);

                // Try to complete login processing
                const result = await this._handleLoginResponse(request, response, error, verifier.verifier);

                // Call back the desktop UI so that it can navigate or show error details
                this._onComplete(result);
        });

        // Start the login
        authorizationRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);
    }

    /*
     * Handle login response objects
     */
    private async _handleLoginResponse(
        request: AuthorizationRequest,
        response: AuthorizationResponse | null,
        error: AuthorizationError | null,
        codeVerifier: string): Promise<UIError | null> {

        // Phase 1 of login has completed
        if (error) {
            return ErrorHandler.getFromOAuthResponse(error, 'authorization_failed');
        }

        // Check that the response state matches the request state
        if (request.state !== response!.state) {
            return ErrorHandler.getFromInvalidLoginResponseState();
        }

        try {

            // Phase 2 of login is to swap the authorization code for tokens
            await this._onCodeReceived(response!.code, codeVerifier);
            return null;

        } catch (e) {

            return ErrorHandler.getFromOAuthResponse(e, 'authorization_code_failed');
        }
    }
}
