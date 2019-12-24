import {AuthorizationServiceConfiguration} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {UIError} from '../../errors/uiError';
import {CustomSchemeNotifier} from '../../utilities/customSchemeNotifier';
import {RedirectEvents} from '../utilities/redirectEvents';
import {EndSessionError} from './endSessionError';
import {EndSessionNotifier} from './endSessionNotifier';
import {EndSessionRequest} from './endSessionRequest';
import {EndSessionRequestHandler} from './endSessionRequestHandler';
import {EndSessionResponse} from './endSessionResponse';

/*
 * A class to handle the plumbind of logout redirects via the system browser
 */
export class LogoutManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _onComplete: (error: UIError | null) => void;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        onComplete: (error: UIError | null) => void) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._onComplete = onComplete;
    }

    /*
     * The stub method just removes tokens
     */
    public async start(): Promise<void> {
        this._onComplete(null);
    }

    /*
     * The future method will do a proper logout redirect
     */
    public async start2(): Promise<void> {

        const logoutRequest = new EndSessionRequest();

        // Create events for this logout attempt
        const logoutEvents = new RedirectEvents();

        // Ensure that completion callbacks are correlated to the correct authorization request
        CustomSchemeNotifier.addCorrelationState(logoutRequest.state, logoutEvents);

        // Create a logout handler that uses the browser
        const logoutRequestHandler = new EndSessionRequestHandler(logoutEvents);

        const notifier = new EndSessionNotifier();
        logoutRequestHandler.setEndSessionNotifier(notifier);
        notifier.setEndSessionListener(async (
            request: EndSessionRequest,
            response: EndSessionResponse | null,
            error: EndSessionError | null) => {

                // Now that we've finished with login events, remove the item for this login attempt
                CustomSchemeNotifier.removeCorrelationState(request.state);

                // Try to complete login processing
                const result = await this._handleLogoutResponse(request, response, error);

                // Call back the desktop UI so that it can navigate or show error details
                this._onComplete(result);
        });

        logoutRequestHandler.performEndSessionRequest(this._metadata, logoutRequest);
    }

    private async _handleLogoutResponse(
        request: EndSessionRequest,
        response: EndSessionResponse | null,
        error: EndSessionError | null): Promise<UIError | null> {

        return null;
    }
}
