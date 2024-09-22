import {BrowserWindow, ipcMain, IpcMainInvokeEvent} from 'electron';
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

        ipcMain.handle(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, this._getDeepLinkStartupPath);
        ipcMain.handle(IpcEventNames.ON_GET_COMPANIES, this._onGetCompanyList);
        ipcMain.handle(IpcEventNames.ON_GET_TRANSACTIONS, this._onGetCompanyTransactions);
        ipcMain.handle(IpcEventNames.ON_GET_OAUTH_USER_INFO, this._onGetOAuthUserInfo);
        ipcMain.handle(IpcEventNames.ON_GET_API_USER_INFO, this._onGetApiUserInfo);
        ipcMain.handle(IpcEventNames.ON_IS_LOGGED_IN, this._onIsLoggedIn);
        ipcMain.handle(IpcEventNames.ON_LOGIN, this._onLogin);
        ipcMain.handle(IpcEventNames.ON_LOGOUT, this._onLogout);
        ipcMain.handle(IpcEventNames.ON_TOKEN_REFRESH, this._onTokenRefresh);
        ipcMain.handle(IpcEventNames.ON_CLEAR_LOGIN_STATE, this._onClearLoginState);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, this._onExpireAccessToken);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, this._onExpireRefreshToken);
    }

    /*
     * When the main side of the Electron app receives a deep link it may notify the renderer
     */
    public handleDeepLink(deepLinkUrl: string): boolean {

        // Handle OAuth login or logout responses
        if (this._authenticatorService.handleDeepLink(deepLinkUrl)) {
            return true;
        }

        // If not handled, notify the React app, which will update its hash location based on the path
        const url = UrlParser.tryParse(deepLinkUrl);
        if (url && url.pathname) {
            const path = url.pathname.replace(this._configuration.oauth.privateSchemeName + ':', '');
            this._window?.webContents.send(IpcEventNames.ON_DEEP_LINK, {data: path});
        }

        return false;
    }

    /*
     * The renderer calls main to ask it the app was started via a deep link
     */
    private _getDeepLinkStartupPath(event: IpcMainInvokeEvent): Promise<[any, string]> {

        const data = {
            path: this._deepLinkStartupPath,
        };

        return this._handleNonAsyncOperation(
            event,
            () => data);
    }

    /*
     * Make an API request to get companies
     */
    private async _onGetCompanyList(event: IpcMainInvokeEvent, args: any): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._fetchService.getCompanyList(args.options));
    }

    /*
     * Make an API request to get transactions
     */
    private async _onGetCompanyTransactions(event: IpcMainInvokeEvent, args: any): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._fetchService.getCompanyTransactions(args.id, args.options));
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async _onGetOAuthUserInfo(event: IpcMainInvokeEvent, args: any): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._fetchService.getOAuthUserInfo(args.options));
    }

    /*
     * Make an API request to get API user info
     */
    private async _onGetApiUserInfo(event: IpcMainInvokeEvent, args: any): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._fetchService.getApiUserInfo(args.options));
    }

    /*
     * See if there are any tokens
     */
    private async _onIsLoggedIn(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._authenticatorService.isLoggedIn());
    }

    /*
     * Run a login redirect on the system browser
     */
    private async _onLogin(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._authenticatorService.login());
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async _onLogout(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._authenticatorService.logout());
    }

    /*
     * Perform token refresh
     */
    private async _onTokenRefresh(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleAsyncOperation(
            event,
            () => this._authenticatorService.tokenRefresh());
    }

    /*
     * Clear login state after certain errors
     */
    private async _onClearLoginState(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleNonAsyncOperation(
            event,
            () => this._authenticatorService.clearLoginState());
    }

    /*
     * For testing, make the access token act expired
     */
    private async _onExpireAccessToken(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleNonAsyncOperation(
            event,
            () => this._authenticatorService.expireAccessToken());
    }

    /*
     * For testing, make the refresh token act expired
     */
    private async _onExpireRefreshToken(event: IpcMainInvokeEvent): Promise<[any, string]> {

        return this._handleNonAsyncOperation(
            event,
            () => this._authenticatorService.expireRefreshToken());
    }

    /*
     * Run an async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async _handleAsyncOperation(event: IpcMainInvokeEvent, action: () => Promise<any>): Promise<[any, string]> {

        try {

            if (!event.senderFrame.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = await action();
            return [data, ''];

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            return [null, errorJson];
        }
    }

    /*
     * Run a non-async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async _handleNonAsyncOperation(event: IpcMainInvokeEvent, action: () => any): Promise<[any, string]> {

        try {
            if (!event.senderFrame.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = action();
            return [data, ''];

        } catch (e: any) {

            const errorJson = ErrorFactory.fromException(e).toJson();
            return [null, errorJson];
        }
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
