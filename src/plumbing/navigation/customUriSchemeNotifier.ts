import {ipcRenderer} from 'electron';
import Url from 'url';
import {CustomUriSchemeEvents} from './customUriSchemeEvents';
import {RedirectEvents} from './redirectEvents';
import {RedirectState} from './redirectState';

/*
 * A class to handle custom scheme responses from the operating system, and correlating to earlier login requests
 */
export class CustomUriSchemeNotifier {

    private _redirectState: RedirectState;

    public constructor() {
        this._redirectState = new RedirectState();
        this._setupCallbacks();
    }

    /*
     * Wire up private URI schemes to the operating system
     */
    public async initialize(): Promise<void> {

        // Register to receive deep linking events from the operating system
        ipcRenderer.on(
            CustomUriSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION,
            this._handleCustomSchemeUrlNotification);

        // Return a promise that fires when the main side of the app
        return new Promise<void>((resolve, reject) => {

            // Ask the main side of the Electron process for the startup URL
            // When started via deep linking this could be a value such as x-mycompany-desktopapp:/company=2
            ipcRenderer.send(CustomUriSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, null);

            // Receive the response
            ipcRenderer.on(CustomUriSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, (event: any, url: any) => {

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
     * During logins, add to the redirect state so that the correct response data is used for each request
     */
    public addCorrelationState(state: string, redirectEvents: RedirectEvents): void {
        return this._redirectState.addState(state, redirectEvents);
    }

    /*
     * After logins, clear redirect state
     */
    public removeCorrelationState(state: string): void {
        return this._redirectState.removeState(state);
    }

    /*
     * Receive URL notifications from the main side of the Electron app
     */
    private _handleCustomSchemeUrlNotification(event: any, url: any): void {

        const parsedUrl = this._tryParseUrl(url);
        if (parsedUrl) {
            if (parsedUrl.query.state) {

                // If there is a state parameter we will classify this as a login request
                this._handleLoginResponseNotification(parsedUrl.query);

            } else if (parsedUrl.path === '/logoutCallback') {

                // Handle logout requests
                this._handleLogoutResponseNotification();

            } else {

                // Otherwise we will treat it a deep linking request
                this._handleDeepLinkingNotification(parsedUrl.path!);
            }
        }
    }

    /*
     * Receive login response data and resume the login flow
     */
    private _handleLoginResponseNotification(queryParams: any): void {

        // Get login events for the login attempt so that we use the correct data for the authorization code grant
        const redirectEvents = this._redirectState.getEvents(queryParams.state);
        if (redirectEvents) {

            // Raise the response event to complete login processing
            redirectEvents.emit(RedirectEvents.ON_AUTHORIZATION_RESPONSE, queryParams);
        }
    }

    /*
     * Receive logout response data and resume the logout flow
     */
    private _handleLogoutResponseNotification(): void {

        const redirectEvents = this._redirectState.getEvents('logout');
        if (redirectEvents) {
            redirectEvents.emit(RedirectEvents.ON_END_SESSION_RESPONSE, null);
        }
    }

    /*
     * Handle deep linking data originating from a URL like x-mycompany-desktopapp:/mycompany=2
     * For our sample this method receives /mycompany=2 and updates it to #mycompany=2
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
