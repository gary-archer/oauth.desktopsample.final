import Opener from 'opener';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {UIError} from '../../errors/uiError';
import {CognitoLogoutUrlBuilder} from './cognitoLogoutUrlBuilder';
import {LogoutResponseCallback} from './logoutResponseCallback';
import {LogoutState} from './logoutState';
import {LogoutUrlBuilder} from './logoutUrlBuilder';
import {OktaLogoutUrlBuilder} from './oktaLogoutUrlBuilder';

/*
 * A class to handle the plumbing of logout redirects via the system browser
 */
export class LogoutManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _state: LogoutState;
    private readonly _idToken: string;
    private readonly _onComplete: (error: UIError | null) => void;

    public constructor(
        configuration: OAuthConfiguration,
        idToken: string,
        state: LogoutState,
        onComplete: LogoutResponseCallback) {

        this._configuration = configuration;
        this._idToken = idToken;
        this._state = state;
        this._onComplete = onComplete;
    }

    /*
     * Invoke the system browser to log the user out
     */
    public async start(): Promise<void> {

        // Return a promise that is resolved when the logout response is received
        return new Promise<void>((resolve, reject) => {

            // First build the logout URL
            const logoutUrl = this._getLogoutUrlBuilder().buildUrl();

            // Create a callback to wait for completion
            const callback = (queryParams: any) => {
                this._onComplete(null);
                resolve();
            };

            // Store the logout callback so that we can receive the response when we receive a browser notification
            this._state.storeLogoutCallback(callback);

            // Invoke the browser with the logout URL
            Opener(logoutUrl);
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
