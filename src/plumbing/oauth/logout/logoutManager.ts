import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {RendererEvents} from '../../events/rendererEvents';
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
    private readonly _events: RendererEvents;
    private readonly _idToken: string;

    public constructor(
        configuration: OAuthConfiguration,
        state: LogoutState,
        events: RendererEvents,
        idToken: string) {

        this._configuration = configuration;
        this._state = state;
        this._events = events;
        this._idToken = idToken;
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

        // Create a callback to wait for completion
        const callback = (queryParams: any) => {

            // Complete the promise when the callback is invoked
            onSuccess();
        };

        try {
            // First build the logout URL
            const logoutUrl = this._getLogoutUrlBuilder().buildUrl();

            // Store the logout callback so that we can receive the response when we receive a browser notification
            this._state.storeLogoutCallback(callback);

            // Ask the main side of the app to open the system browser
            await this._events.openSystemBrowser(logoutUrl);

        } catch (e) {

            // Capture errors
            onError(e);
        }
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
