import {BrowserWindow, IpcMainEvent, ipcMain} from 'electron';
import {FetchService} from '../../api/client/fetchService';
import {Configuration} from '../../configuration/configuration';
import {HttpProxy} from '../utilities/httpProxy';
import {ErrorFactory} from '../errors/errorFactory';
import {AuthenticatorService} from '../oauth/authenticatorService';
import {AuthenticatorServiceImpl} from '../oauth/authenticatorServiceImpl';
import {UrlParser} from '../utilities/urlParser';
import {IpcEventNames} from './ipcEventNames';

/*
 * A class to encapsulate IPC messages sent and received by the main side of our app
 */
export class MainIpcEvents {

    private readonly _configuration: Configuration;
    private readonly _httpProxy: HttpProxy;
    private readonly _authenticatorService: AuthenticatorService;
    private readonly _fetchService: FetchService;
    private _window: BrowserWindow | null;
    private _deepLinkStartupPath: string | null;

    public constructor(configuration: Configuration) {
        this._configuration = configuration;
        this._httpProxy = new HttpProxy(this._configuration.app.useProxy, this._configuration.app.proxyUrl);
        this._window = null;
        this._authenticatorService = new AuthenticatorServiceImpl(this._configuration.oauth, this._httpProxy);
        this._fetchService = new FetchService(this._configuration, this._authenticatorService, this._httpProxy);
        this._deepLinkStartupPath = null;
        this._setupCallbacks();
    }

    /*
     * Store the deep link startup URL if applicable
     */
    public set deepLinkStartupUrl(startupUrl: string) {
        this._deepLinkStartupPath = startupUrl.replace(this._configuration.oauth.privateSchemeName + ':', '');
    }

    /*
     * Store the window, load tokens and register to receive IPC messages from the renderer process
     */
    public register(window: BrowserWindow): void {

        this._window = window;
        this._authenticatorService.initialise();

        ipcMain.on(IpcEventNames.ON_GET_COMPANIES, this._onGetCompanyList);
        ipcMain.on(IpcEventNames.ON_GET_TRANSACTIONS, this._onGetCompanyTransactions);
        ipcMain.on(IpcEventNames.ON_GET_OAUTH_USER_INFO, this._onGetOAuthUserInfo);
        ipcMain.on(IpcEventNames.ON_GET_API_USER_INFO, this._onGetApiUserInfo);
        ipcMain.on(IpcEventNames.ON_IS_LOGGED_IN, this._onIsLoggedIn);
        ipcMain.on(IpcEventNames.ON_LOGIN, this._onLogin);
        ipcMain.on(IpcEventNames.ON_LOGOUT, this._onLogout);
        ipcMain.on(IpcEventNames.ON_TOKEN_REFRESH, this._onTokenRefresh);
        ipcMain.on(IpcEventNames.ON_CLEAR_LOGIN_STATE, this._onClearLoginState);
        ipcMain.on(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, this._onExpireAccessToken);
        ipcMain.on(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, this._onExpireRefreshToken);
        ipcMain.on(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, this._getDeepLinkStartupPath);
    }

    /*
     * Make an API request to get companies
     */
    private async _onGetCompanyList(event: IpcMainEvent, args: any): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_GET_COMPANIES,
            () => this._fetchService.getCompanyList(args.options));
    }

    /*
     * Make an API request to get transactions
     */
    private async _onGetCompanyTransactions(event: IpcMainEvent, args: any): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_GET_TRANSACTIONS,
            () => this._fetchService.getCompanyTransactions(args.id, args.options));
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async _onGetOAuthUserInfo(event: IpcMainEvent, args: any): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_GET_OAUTH_USER_INFO,
            () => this._fetchService.getOAuthUserInfo(args.options));
    }

    /*
     * Make an API request to get API user info
     */
    private async _onGetApiUserInfo(event: IpcMainEvent, args: any): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_GET_API_USER_INFO,
            () => this._fetchService.getApiUserInfo(args.options));
    }

    /*
     * See if there are any tokens
     */
    private async _onIsLoggedIn(): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_IS_LOGGED_IN,
            () => this._authenticatorService.isLoggedIn());
    }

    /*
     * Run a login redirect on the system browser
     */
    private async _onLogin(): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_LOGIN,
            () => this._authenticatorService.login());
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async _onLogout(): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_LOGOUT,
            () => this._authenticatorService.logout());
    }

    /*
     * Perform token refresh
     */
    private async _onTokenRefresh(): Promise<void> {

        await this._processAsyncRequestResponseIpcMessage(
            IpcEventNames.ON_TOKEN_REFRESH,
            () => this._authenticatorService.tokenRefresh());
    }

    /*
     * Clear login state after certain errors
     */
    private async _onClearLoginState(): Promise<void> {

        this._processRequestResponseIpcMessage(
            IpcEventNames.ON_CLEAR_LOGIN_STATE,
            () => this._authenticatorService.clearLoginState());
    }

    /*
     * For testing, make the access token act expired
     */
    private _onExpireAccessToken(): void {

        this._processRequestResponseIpcMessage(
            IpcEventNames.ON_EXPIRE_ACCESS_TOKEN,
            () => this._authenticatorService.expireAccessToken());
    }

    /*
     * For testing, make the refresh token act expired
     */
    private _onExpireRefreshToken(): void {

        this._processRequestResponseIpcMessage(
            IpcEventNames.ON_EXPIRE_REFRESH_TOKEN,
            () => this._authenticatorService.expireRefreshToken());
    }

    /*
     * Receive deep links on the main side of the Electron app
     */
    public handleDeepLink(deepLinkUrl: string): boolean {

        // Handle OAuth login or logout responses
        if (this._authenticatorService.handleDeepLink(deepLinkUrl)) {
            return true;
        }

        // If not handled, forward to the React app, which will update its hash location based on the path
        const url = UrlParser.tryParse(deepLinkUrl);
        if (url && url.pathname) {
            const path = url.pathname.replace(this._configuration.oauth.privateSchemeName + ':', '');
            this._window?.webContents.send(IpcEventNames.ON_DEEP_LINK, path);
        }

        return false;
    }

    /*
     * Encapsulate processing an IPC call and returning response data
     */
    private async _processAsyncRequestResponseIpcMessage(
        eventName: string,
        action: () => Promise<any>): Promise<void> {

        try {
            const response = await action();
            this._sendResponse(eventName, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(eventName, null, errorJson);
        }
    }

    /*
     * Encapsulate processing an IPC call and returning response data
     */
    private _processRequestResponseIpcMessage(eventName: string, action: () => any): void {

        try {
            const response = action();
            this._sendResponse(eventName, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(eventName, null, errorJson);
        }
    }

    /*
     * The app could have been started via deep linking
     * In this case the renderer side of the app can send us a message to get the startup URL
     */
    private _getDeepLinkStartupPath(): void {
        this._sendResponse(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, this._deepLinkStartupPath, null);
    }

    /*
     * Send the response to the renderer side of the application
     */
    private _sendResponse(eventName: string, data: any, error: any) {
        this._window?.webContents.send(eventName, {data, error});
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {

        this._onGetCompanyList = this._onGetCompanyList.bind(this);
        this._onGetCompanyTransactions = this._onGetCompanyTransactions.bind(this);
        this._onGetOAuthUserInfo = this._onGetOAuthUserInfo.bind(this);
        this._onGetApiUserInfo = this._onGetApiUserInfo.bind(this);
        this._onIsLoggedIn = this._onIsLoggedIn.bind(this);
        this._onLogin = this._onLogin.bind(this);
        this._onLogout = this._onLogout.bind(this);
        this._onTokenRefresh = this._onTokenRefresh.bind(this);
        this._onClearLoginState = this._onClearLoginState.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
        this._getDeepLinkStartupPath = this._getDeepLinkStartupPath.bind(this);
    }
}
