import Opener from 'opener';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {UIError} from '../../errors/uiError';
import {AppEvents} from '../../events/appEvents';
import {CustomUriSchemeNotifier} from '../../events/customUriSchemeNotifier';
import {OAuthState} from '../oauthState';
import {CognitoLogoutUrlBuilder} from './cognitoLogoutUrlBuilder';
import {LogoutUrlBuilder} from './logoutUrlBuilder';
import {OktaLogoutUrlBuilder} from './oktaLogoutUrlBuilder';

/*
 * A class to handle the plumbing of logout redirects via the system browser
 */
export class LogoutManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _customSchemeNotifier: CustomUriSchemeNotifier;
    private readonly _idToken: string;
    private readonly _onComplete: (error: UIError | null) => void;

    public constructor(
        configuration: OAuthConfiguration,
        customSchemeNotifier: CustomUriSchemeNotifier,
        idToken: string,
        onComplete: (error: UIError | null) => void) {

        this._configuration = configuration;
        this._customSchemeNotifier = customSchemeNotifier;
        this._idToken = idToken;
        this._onComplete = onComplete;
    }

    /*
     * Invoke the system browser
     */
    public async start(): Promise<void> {

        // First build the logout URL
        const logoutUrl = this._getLogoutUrlBuilder().buildUrl();

        // Create the events object that will notify us of completion
        const events = new AppEvents();

        // Ensure that completion callbacks are correlated to the correct logout request
        this._customSchemeNotifier.addCorrelationState(OAuthState.logout, events);

        // Invoke the browser
        Opener(logoutUrl);

        // Return a promise that is resolved when the logout response is received
        return new Promise<void>((resolve, reject) => {

            // Wait for the response event from the CustomSchemeNotifier class
            events.once(AppEvents.ON_END_SESSION_RESPONSE, (error: UIError | null) => {

                this._customSchemeNotifier.removeCorrelationState(OAuthState.logout);
                this._onComplete(error);
                resolve();
            });
        });
    }

    /*
     * Get a builder object to deal with vendor specific behaviour in Cognito
     */
    private _getLogoutUrlBuilder(): LogoutUrlBuilder {

        if (this._configuration.authority.toLowerCase().indexOf('cognito') !== -1) {
            return new CognitoLogoutUrlBuilder(this._configuration);
        } else {
            return new OktaLogoutUrlBuilder(this._configuration, this._idToken);
        }
    }
}
