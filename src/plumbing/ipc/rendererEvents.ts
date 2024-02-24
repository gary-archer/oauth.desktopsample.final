import EventBus from 'js-event-bus';
import {Configuration} from '../../configuration/configuration';
import {DeepLinkEvent} from '../../plumbing/events/deepLinkEvent';
import {EventNames} from '../../plumbing/events/eventNames';
import {UIError} from '../errors/uiError';
import {IpcEventNames} from './ipcEventNames';
import {TokenData} from '../oauth/tokenData';

/*
 * A class to encapsulate IPC messages sent and received by the renderer side of our app
 */
export class RendererEvents {

    private readonly _eventBus: EventBus;
    private readonly _api: any;

    public constructor(eventBus: EventBus) {
        this._eventBus = eventBus;
        this._api = (window as any).api;
        this._setupCallbacks();
    }

    /*
     * Register to receive IPC messages from the main process
     */
    public register(): void {

        this._api.receiveIpcMessage(
            IpcEventNames.ON_PRIVATE_URI_SCHEME_NOTIFICATION,
            this._handlePrivateUriSchemeNotification);
    }

    /*
     * Call the main side of the application to read the file system
     */
    public async loadConfiguration(): Promise<Configuration> {

        return this._sendIpcMessage(IpcEventNames.ON_GET_CONFIGURATION, {});
    }

    /*
     * If the app was started via a deep link then set the startup URL
     */
    public async setDeepLinkStartupUrlIfRequired(): Promise<void> {

        // See if the app was started by a deep link
        const urlString = await this._sendIpcMessage(IpcEventNames.ON_GET_DEEP_LINK_STARTUP_URL, {});

        // If there was a startup URL set the hash location of the React app accordingly
        // This ensures that we move straight to the linked page rather than rendering the default page first
        if (urlString) {

            const url = this._tryParseUrl(urlString);
            if (url && url.pathname) {
                this._handleDeepLinkingNotification(url.pathname);
            }
        }
    }

    /*
     * Run a login on the main side of the app
     */
    public async login(): Promise<void> {

        await this._sendIpcMessage(IpcEventNames.ON_LOGIN, {});
    }

    /*
     * Run a logout on the main side of the app
     */
    public async logout(): Promise<void> {

        await this._sendIpcMessage(IpcEventNames.ON_LOGOUT, {});
    }

    /*
     * Call the main side of the application to load tokens
     */
    public async loadTokens(): Promise<TokenData | null> {

        return this._sendIpcMessage(IpcEventNames.ON_LOAD_TOKENS, {});
    }

    /*
     * Call the main side of the application to save tokens
     */
    public async saveTokens(tokenData: TokenData): Promise<void> {

        await this._sendIpcMessage(IpcEventNames.ON_SAVE_TOKENS, tokenData);
    }

    /*
     * Call the main side of the application to remove tokens
     */
    public async deleteTokens(): Promise<void> {

        await this._sendIpcMessage(IpcEventNames.ON_DELETE_TOKENS, {});
    }

    /*
     * Encapsulate making an IPC call and returning data
     */
    private async _sendIpcMessage(eventName: string, requestData: any): Promise<any> {

        const result = await this._api.sendIpcMessage(eventName, requestData);
        if (result.error) {
            throw UIError.fromJson(result.error);
        }

        return result.data;
    }

    /*
     * Receive URL notifications from the main side of the Electron app
     */
    private _handlePrivateUriSchemeNotification(data: any): void {

        const url = this._tryParseUrl(data as string);
        if (url && url.pathname) {

            // Otherwise we will treat it a deep linking request and update the hash location
            this._handleDeepLinkingNotification(url.pathname);
        }
    }

    /*
     * Handle deep linking data originating from a URL like x-mycompany-desktopapp:/companies/2
     */
    private _handleDeepLinkingNotification(path: string): void {
        this._eventBus.emit(EventNames.DeepLink, null, new DeepLinkEvent(path));
    }

    /*
     * Private URI scheme notifications could provide malformed input, so parse them safely
     */
    private _tryParseUrl(url: string): URL | null {

        try {
            return new URL(url);
        } catch (e: any) {
            return null;
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._handlePrivateUriSchemeNotification = this._handlePrivateUriSchemeNotification.bind(this);
        this._handleDeepLinkingNotification = this._handleDeepLinkingNotification.bind(this);
    }
}
