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
import {UIError} from '../../errors/uiError';
import {AppEvents} from '../../events/appEvents';
import {CustomUriSchemeNotifier} from '../../events/customUriSchemeNotifier';
import {LoginRequestHandler} from './loginRequestHandler';

/*
 * A class to handle the plumbing of login redirects via the system browser
 */
export class LoginManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _customSchemeNotifier: CustomUriSchemeNotifier;
    private readonly _onCodeReceived: (code: string, verifier: string) => void;
    private readonly _onComplete: (error: UIError | null) => void;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        customSchemeNotifier: CustomUriSchemeNotifier,
        onCodeReceived: (code: string, verifier: string) => void,
        onComplete: (error: UIError | null) => void) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._customSchemeNotifier = customSchemeNotifier;
        this._onCodeReceived = onCodeReceived;
        this._onComplete = onComplete;
    }

    /*
     * Start the login redirect and listen for the response
     */
    public async start(): Promise<void> {

        // Create the authorization request
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: this._configuration.redirectUri,
            scope: this._configuration.scope,
        } as AuthorizationRequestJson;
        const authorizationRequest = new AuthorizationRequest(requestJson, new DefaultCrypto(), true);

        // Set up PKCE for the redirect, which avoids native app vulnerabilities
        await authorizationRequest.setupCodeVerifier();

        // Create events for this login attempt
        const events = new AppEvents();

        // Ensure that completion callbacks are correlated to the correct authorization request
        this._customSchemeNotifier.addCorrelationState(authorizationRequest.state, events);

        // Create an authorization handler that uses the browser
        const authorizationRequestHandler = new LoginRequestHandler(events);

        // Use the AppAuth mechanism of a notifier to receive the login result
        const notifier = new AuthorizationNotifier();
        authorizationRequestHandler.setAuthorizationNotifier(notifier);
        notifier.setAuthorizationListener(async (
            request: AuthorizationRequest,
            response: AuthorizationResponse | null,
            error: AuthorizationError | null) => {

                // Now that we've finished with login events, remove the item for this login attempt
                this._customSchemeNotifier.removeCorrelationState(request.state);

                // Try to complete login processing
                const result = await this._handleLoginResponse(request, response, error);

                // Call back the desktop UI so that it can navigate or show error details
                this._onComplete(result);
        });

        // Start the login
        authorizationRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);
    }

    /*
     * Start the second phase of login, to swap the authorization code for tokens
     */
    private async _handleLoginResponse(
        request: AuthorizationRequest,
        response: AuthorizationResponse | null,
        error: AuthorizationError | null): Promise<UIError | null> {

        // Phase 1 of login has completed
        if (error) {
            return ErrorHandler.getFromOAuthResponse(error, ErrorCodes.loginResponseFailed);
        }

        // Check that the response state matches the request state
        if (request.state !== response!.state) {
            return ErrorHandler.getFromInvalidLoginResponseState();
        }

        try {

            // Get the PKCE verifier
            const codeVerifierKey = 'code_verifier';
            const codeVerifier = request.internal![codeVerifierKey];

            // Swap the authorization code for tokens
            await this._onCodeReceived(response!.code, codeVerifier);
            return null;

        } catch (e) {

            return ErrorHandler.getFromOAuthResponse(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }
}