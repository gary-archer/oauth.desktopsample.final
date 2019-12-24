import {ipcRenderer} from 'electron';
import Url from 'url';
import {RedirectEvents} from '../oauth/utilities/redirectEvents';
import {RedirectState} from '../oauth/utilities/redirectState';
import {CustomSchemeEvents} from './customSchemeEvents';

/*
 * A class to handle custom scheme responses from the operating system, and correlating to earlier login requests
 */
export class CustomSchemeNotifier {

    /*
     * Wire up custom schemes
     */
    public static async initialize(): Promise<void> {

        // Receive events from the operating system
        ipcRenderer.on(
            CustomSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION,
            CustomSchemeNotifier._handleCustomSchemeUrlNotification);

        // Set a startup URL if applicable
        await CustomSchemeNotifier._setStartupUrl();
    }

    /*
     * During logins, add to the login state so that the correct response data is used for each request
     */
    public static addCorrelationState(state: string, loginEvents: RedirectEvents): void {
        return CustomSchemeNotifier._loginState.addState(state, loginEvents);
    }

    /*
     * After logins, clear login state
     */
    public static removeCorrelationState(state: string): void {
        return CustomSchemeNotifier._loginState.removeState(state);
    }

    /*
     * Store login state across all attempts
     */
    private static _loginState = new RedirectState();

    /*
     * This asks the main side of the app for the startup deep linking path
     * The app could have been started with an email link such as x-mycompany-desktopapp:/company=2
     * In this case we want to move straight to that page rather than rendering the default page first
     */
    private static async _setStartupUrl(): Promise<void> {

        return new Promise<void>((resolve, reject) => {

            // Send a request for the startup path
            ipcRenderer.send(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, null);

            // Receive the response
            ipcRenderer.on(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, (event: any, url: any) => {

                // If there was a startup URL then update the Electron app's hash location
                if (url) {
                    const parsedUrl = CustomSchemeNotifier._tryParseUrl(url);
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
    private static _handleCustomSchemeUrlNotification(event: any, url: any): void {

        const parsedUrl = CustomSchemeNotifier._tryParseUrl(url);
        if (parsedUrl) {

            if (parsedUrl.query.state) {

                // If there is a state parameter we will classify this as a login request
                CustomSchemeNotifier._handleLoginResponseNotification(parsedUrl.query);
            } else {

                // Otherwise we will treat it a deep linking request
                CustomSchemeNotifier._handleDeepLinkingNotification(parsedUrl.path!);
            }
        }
    }

    /*
     * Receive login response data and resume the login flow
     */
    private static _handleLoginResponseNotification(queryParams: any): void {

        // Get login events for the login attempt so that we use the correct data for the authorization code grant
        const loginEvents = CustomSchemeNotifier._loginState.getEvents(queryParams.state);
        if (loginEvents) {

            // Raise the response event to complete login processing
            loginEvents.emit(RedirectEvents.ON_AUTHORIZATION_RESPONSE, queryParams);
        }
    }

    /*
     * Handle deep linking data originating from a URL like x-mycompany-desktopapp:/mycompany=2
     * For our sample this method receives /mycompany=2 and updates it to #mycompany=2
     */
    private static _handleDeepLinkingNotification(deepLinkingPath: string): void {

        const deepLinkedHashLocation = '#' + deepLinkingPath.substring(1);
        location.hash = deepLinkedHashLocation;
    }

    /*
     * Custom scheme URLs are input that could be malformed, so parse them safely
     */
    private static _tryParseUrl(url: string): Url.UrlWithParsedQuery | null {

        try {
            return Url.parse(url, true);
        } catch (e) {
            return null;
        }
    }
}
