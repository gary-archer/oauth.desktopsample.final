import {AuthorizationServiceConfiguration} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {RendererEvents} from '../../ipc/rendererEvents';
import {CognitoLogoutUrlBuilder} from './cognitoLogoutUrlBuilder';
import {LogoutState} from './logoutState';
import {LogoutUrlBuilder} from './logoutUrlBuilder';
import {StandardLogoutUrlBuilder} from './standardLogoutUrlBuilder';

/*
 * A class to handle the plumbing of logout redirects via the system browser
 */
export class LogoutManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LogoutState;
    private readonly _events: RendererEvents;
    private readonly _idToken: string;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LogoutState,
        events: RendererEvents,
        idToken: string) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._events = events;
        this._idToken = idToken;
    }

    /*
     * Invoke the system browser to log the user out
     */
    public async start(): Promise<void> {

        /* eslint-disable no-async-promise-executor */
        return new Promise(async (resolve, reject) => {

            // Create a callback to wait for completion
            /* eslint-disable @typescript-eslint/no-unused-vars */
            const callback = (queryParams: any) => {
                resolve();
            };

            try {
                // First build the logout URL
                const logoutUrl = this._getLogoutUrlBuilder().buildUrl();

                // Store the logout callback so that we can receive the response when we receive a browser notification
                this._state.storeLogoutCallback(callback);

                // Ask the main side of the app to open the system browser
                await this._events.openSystemBrowser(logoutUrl);

            } catch (e) {

                // Report errors correctly from the above async call
                reject(e);
            }
        });
    }

    /*
     * Get a builder object to deal with vendor specific behaviour in Cognito
     */
    private _getLogoutUrlBuilder(): LogoutUrlBuilder {

        if (this._configuration.authority.toLowerCase().indexOf('cognito') !== -1) {
            return new CognitoLogoutUrlBuilder(this._configuration);
        } else {
            return new StandardLogoutUrlBuilder(this._configuration, this._metadata, this._idToken);
        }
    }
}
