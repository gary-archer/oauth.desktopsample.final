import {BrowserWindow, IpcMainEvent, ipcMain} from 'electron';
import {FetchService} from '../../api/client/fetchService';
import {Configuration} from '../../configuration/configuration';
import {ErrorFactory} from '../errors/errorFactory';
import {AuthenticatorService} from '../oauth/authenticatorService';
import {AuthenticatorServiceImpl} from '../oauth/authenticatorServiceImpl';
import {UrlParser} from '../utilities/urlParser';
import {IpcEventNames} from './ipcEventNames';

/*
 * A class to encapsulate IPC messages sent and received by the main side of our app
 */
export class MainEvents {

    private readonly _configuration: Configuration;
    private readonly _window: BrowserWindow;
    private readonly _authenticatorService: AuthenticatorService;
    private readonly _fetchService: FetchService;
    private _deepLinkStartupPath: string | null;

    public constructor(configuration: Configuration, window: BrowserWindow) {
        this._configuration = configuration;
        this._window = window;
        this._authenticatorService = new AuthenticatorServiceImpl(this._configuration.oauth);
        this._fetchService = new FetchService(this._configuration, this._authenticatorService);
        this._deepLinkStartupPath = null;
        this._setupCallbacks();
    }

    /*
     * Register to receive IPC messages from the renderer process
     */
    public register(): void {

        ipcMain.on(IpcEventNames.ON_GET_COMPANIES, this._onGetCompanyList);
        ipcMain.on(IpcEventNames.ON_GET_TRANSACTIONS, this._onGetCompanyTransactions);
        ipcMain.on(IpcEventNames.ON_GET_OAUTH_USER_INFO, this._onGetOAuthUserInfo);
        ipcMain.on(IpcEventNames.ON_GET_API_USER_INFO, this._onGetApiUserInfo);
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

        try {
            const response = await this._fetchService.getCompanyList(args.options);
            this._sendResponse(IpcEventNames.ON_GET_COMPANIES, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_GET_COMPANIES, null, errorJson);
        }
    }

    /*
     * Make an API request to get transactions
     */
    private async _onGetCompanyTransactions(event: IpcMainEvent, args: any): Promise<void> {

        try {
            const response = await this._fetchService.getCompanyTransactions(args.id, args.options);
            this._sendResponse(IpcEventNames.ON_GET_TRANSACTIONS, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_GET_TRANSACTIONS, null, errorJson);
        }
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async _onGetOAuthUserInfo(event: IpcMainEvent, args: any): Promise<void> {

        try {
            const response = await this._fetchService.getOAuthUserInfo(args.options);
            this._sendResponse(IpcEventNames.ON_GET_OAUTH_USER_INFO, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_GET_OAUTH_USER_INFO, null, errorJson);
        }
    }

    /*
     * Make an API request to get API user info
     */
    private async _onGetApiUserInfo(event: IpcMainEvent, args: any): Promise<void> {

        try {
            const response = await this._fetchService.getApiUserInfo(args.options);
            this._sendResponse(IpcEventNames.ON_GET_API_USER_INFO, response, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_GET_API_USER_INFO, null, errorJson);
        }
    }

    /*
     * Run a login redirect on the system browser
     */
    private async _onLogin(): Promise<void> {

        try {
            await this._authenticatorService.login();
            this._sendResponse(IpcEventNames.ON_LOGIN, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_LOGIN, null, errorJson);
        }
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async _onLogout(): Promise<void> {

        try {
            await this._authenticatorService.logout();
            this._sendResponse(IpcEventNames.ON_LOGOUT, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_LOGOUT, null, errorJson);
        }
    }

    /*
     * Perform token refresh
     */
    private async _onTokenRefresh(): Promise<void> {

        try {
            await this._authenticatorService.tokenRefresh();
            this._sendResponse(IpcEventNames.ON_TOKEN_REFRESH, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_TOKEN_REFRESH, null, errorJson);
        }
    }

    /*
     * Clear login state after certain errors
     */
    private async _onClearLoginState(): Promise<void> {

        try {
            await this._authenticatorService.clearLoginState();
            this._sendResponse(IpcEventNames.ON_CLEAR_LOGIN_STATE, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_CLEAR_LOGIN_STATE, null, errorJson);
        }
    }

    /*
     * For testing, make the access token act expired
     */
    private async _onExpireAccessToken(): Promise<void> {

        try {
            await this._authenticatorService.expireAccessToken();
            this._sendResponse(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, null, errorJson);
        }
    }

    /*
     * For testing, make the refresh token act expired
     */
    private async _onExpireRefreshToken(): Promise<void> {

        try {
            await this._authenticatorService.expireRefreshToken();
            this._sendResponse(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, null, null);

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            this._sendResponse(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, null, errorJson);
        }
    }

    /*
     * Set a deep link startup URL if applicable
     */
    public set deepLinkStartupUrl(startupUrl: string) {
        console.log('*** STARTUP DEEP LINK URL: ' + startupUrl);
        this._deepLinkStartupPath = startupUrl.replace(this._configuration.oauth.privateSchemeName, '');
        console.log('*** STARTUP DEEP LINK PATH: ' + this._deepLinkStartupPath);
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
            console.log('*** RUNTIME DEEP LINK URL: ' + url.pathname);
            const path = url.pathname.replace(this._configuration.oauth.privateSchemeName, '');
            console.log('*** RUNTIME DEEP LINK PATH: ' + path);
            this._window!.webContents.send(IpcEventNames.ON_DEEP_LINK, url);
        }

        return false;
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
        this._window!.webContents.send(eventName, {data, error});
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {

        this._onGetCompanyList = this._onGetCompanyList.bind(this);
        this._onGetCompanyTransactions = this._onGetCompanyTransactions.bind(this);
        this._onGetOAuthUserInfo = this._onGetOAuthUserInfo.bind(this);
        this._onGetApiUserInfo = this._onGetApiUserInfo.bind(this);
        this._onLogin = this._onLogin.bind(this);
        this._onLogout = this._onLogout.bind(this);
        this._onTokenRefresh = this._onTokenRefresh.bind(this);
        this._onClearLoginState = this._onClearLoginState.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
        this._getDeepLinkStartupPath = this._getDeepLinkStartupPath.bind(this);
    }
}
