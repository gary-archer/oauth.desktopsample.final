import {ipcRenderer} from 'electron';
import Url from 'url';
import {CustomUriSchemeConfiguration} from '../../configuration/customUriSchemeConfiguration';
import {LoginState} from '../oauth/login/loginState';
import {LogoutState} from '../oauth/logout/logoutState';
import {CustomSchemeEvents} from './customSchemeEvents';

/*
 * A class to handle custom scheme responses from the operating system, and correlating to earlier login requests
 */
export class CustomUriSchemeNotifier {

    private readonly _configuration: CustomUriSchemeConfiguration;
    private _loginState!: LoginState;
    private _logoutState!: LogoutState;

    /*
     * At application startup register to receive deep linking events from the Electron main process
     */
    public constructor(configuration: CustomUriSchemeConfiguration) {
        this._configuration = configuration;
        this._setupCallbacks();
        ipcRenderer.on(CustomSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION, this._handleCustomSchemeUrlNotification);
    }

    /*
     * State objects are used when we receive OAuth custom scheme notifications
     */
    public initialise(loginState: LoginState, logoutState: LogoutState): void {
        this._loginState = loginState;
        this._logoutState = logoutState;
    }

    /*
     * If the app was started via a deep link then set the startup URL
     */
    public async setDeepLinkStartupUrlIfRequired(): Promise<void> {

        return new Promise<void>((resolve, reject) => {

            // When started via deep linking this could be a value such as x-mycompany-desktopapp:/company=2
            ipcRenderer.send(CustomSchemeEvents.ON_GET_CUSTOM_SCHEME_STARTUP_URL, this._configuration.value);

            // Receive the response
            ipcRenderer.on(CustomSchemeEvents.ON_GET_CUSTOM_SCHEME_STARTUP_URL, (event: any, url: any) => {

                // If there was a startup URL set the hash location of the ReactJS app accordingly
                // This ensures that we move straight to the linked page rather than rendering the default page first
                if (url) {
                    const parsedUrl = this._tryParseUrl(url);
                    if (parsedUrl) {
                        this._handleDeepLinkingNotification(parsedUrl.path!);
                    }
                }

                resolve();
            });
        });
    }

    /*
     * Receive URL notifications from the main side of the Electron app
     */
    private _handleCustomSchemeUrlNotification(event: any, url: any): void {

        const parsedUrl = this._tryParseUrl(url);
        if (parsedUrl) {
            if (parsedUrl.query.state) {

                // If there is a state parameter we will classify this as a login response
                this._loginState.handleLoginResponse(parsedUrl.query);

            } else if (parsedUrl.path === this._configuration.logoutPath) {

                // Handle logout responses
                this._logoutState.handleLogoutResponse(parsedUrl.query);

            } else {

                // Otherwise we will treat it a deep linking request and update the hash location
                this._handleDeepLinkingNotification(parsedUrl.path!);
            }
        }
    }

    /*
     * Handle deep linking data originating from a URL like x-mycompany-desktopapp:/company=2
     * For our sample this method receives /company=2 and updates it to #company=2
     */
    private _handleDeepLinkingNotification(deepLinkingPath: string): void {

        const deepLinkedHashLocation = '#' + deepLinkingPath.substring(1);
        location.hash = deepLinkedHashLocation;
    }

    /*
     * Private URI scheme notifications could provide malformed input, so parse them safely
     */
    private _tryParseUrl(url: string): Url.UrlWithParsedQuery | null {

        try {
            return Url.parse(url, true);
        } catch (e) {
            return null;
        }
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._handleCustomSchemeUrlNotification = this._handleCustomSchemeUrlNotification.bind(this);
        this._tryParseUrl = this._tryParseUrl.bind(this);
    }
}
