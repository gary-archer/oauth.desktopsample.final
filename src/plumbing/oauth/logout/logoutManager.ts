import Opener from 'opener';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {CognitoLogoutUrlBuilder} from './cognitoLogoutUrlBuilder';
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

    public constructor(
        configuration: OAuthConfiguration,
        idToken: string,
        state: LogoutState) {

        this._configuration = configuration;
        this._idToken = idToken;
        this._state = state;
    }

    /*
     * Invoke the system browser to log the user out
     */
    public async start(): Promise<void> {

        return new Promise<void>(async (resolve, reject) => {

            try {
                await this._startLogout(resolve, reject);
            } catch (e) {
                reject(e);
            }
        });
    }

    /*
     * Do the work to start the logout
     */
    private async _startLogout(onSuccess: () => void, onError: (e: any) => void): Promise<void> {

        // First build the logout URL
        const logoutUrl = this._getLogoutUrlBuilder().buildUrl();

        // Create a callback to wait for completion
        const callback = (queryParams: any) => {

            // Complete the promise when the callback is invoked
            onSuccess();
        };

        // Store the logout callback so that we can receive the response when we receive a browser notification
        this._state.storeLogoutCallback(callback);

        // Invoke the browser with the logout URL
        Opener(logoutUrl);
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
