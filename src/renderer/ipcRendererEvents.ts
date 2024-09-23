import EventBus from 'js-event-bus';
import {FetchOptions} from '../shared/api/fetchOptions';
import {UIError} from '../shared/errors/uiError';
import {IpcEventNames} from '../shared/ipcEventNames';
import {DeepLinkEvent} from './views/events/deepLinkEvent';
import {UIEventNames} from './views/events/uiEventNames';

/*
 * A class that deals with IPC events on the renderer side of the app
 */
export class IpcRendererEvents {

    private readonly _eventBus: EventBus;
    private readonly _api: any;

    public constructor(eventBus: EventBus) {
        this._eventBus = eventBus;
        this._api = (window as any).api;
        this._setupCallbacks();
    }

    /*
     * Register to receive deep link notifications that update the React app's location
     */
    public register(): void {
        this._api.receiveMessage(IpcEventNames.ON_DEEP_LINK, this._handleDeepLink);
    }

    /*
     * If there was a startup URL set the hash location of the React app accordingly
     * This ensures that we move straight to the linked page rather than rendering the default page first
     */
    public async setDeepLinkStartupUrlIfRequired(): Promise<void> {

        const data = await this._sendMessage(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, {});
        if (data.path) {
            this._eventBus.emit(UIEventNames.DeepLink, null, new DeepLinkEvent(data.path));
        }
    }

    /*
     * Make an API request to get companies
     */
    public async getCompanyList(options: FetchOptions) : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_COMPANIES, {options});
    }

    /*
     * Make an API request to get company transactions
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_TRANSACTIONS, {id, options});
    }

    /*
     * Make an API request to get OAuth user info
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_OAUTH_USER_INFO, {options});
    }

    /*
     * Make an API request to get API user info
     */
    public async getApiUserInfo(options: FetchOptions) : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_API_USER_INFO, {options});
    }

    /*
     * Ask the main side of the app if it is logged in
     */
    public async isLoggedIn() : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_IS_LOGGED_IN, {});
    }

    /*
     * Run a login on the main side of the app
     */
    public async login(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_LOGIN, {});
    }

    /*
     * Run a logout on the main side of the app
     */
    public async logout(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_LOGOUT, {});
    }

    /*
     * Run a token refresh on the main side of the app
     */
    public async tokenRefresh(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_TOKEN_REFRESH, {});
    }

    /*
     * Ask the main side of the app to clear login state after certain errors
     */
    public async clearLoginState(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_CLEAR_LOGIN_STATE, {});
    }

    /*
     * For testing, ask the main side to make the access token act expired
     */
    public async expireAccessToken(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, {});
    }

    /*
     * For testing, ask the main side to make the refresh token act expired
     */
    public async expireRefreshToken(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, {});
    }

    /*
     * Encapsulate making an IPC call and receiving response data
     */
    private async _sendMessage(eventName: string, requestData: any): Promise<any> {

        const result = await this._api.sendMessage(eventName, requestData);
        if (result.error) {
            throw UIError.fromJson(result.error);
        }

        return result.data;
    }

    /*
     * Receive deep links from the main side of the Electron app and raise a UI event to views
     */
    private _handleDeepLink(args: any): void {

        const path = args as string;
        if (path) {
            this._eventBus.emit(UIEventNames.DeepLink, null, new DeepLinkEvent(path));
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._handleDeepLink = this._handleDeepLink.bind(this);
    }
}
