import {BrowserWindow, ipcMain, IpcMainInvokeEvent} from 'electron';
import {ApiUserInfo} from '../shared/api/apiUserInfo';
import {Company} from '../shared/api/company';
import {CompanyTransactions} from '../shared/api/companyTransactions';
import {OAuthUserInfo} from '../shared/api/oauthUserInfo';
import {ErrorFactory} from '../shared/errors/errorFactory';
import {UIError} from '../shared/errors/uiError';
import {IpcEventNames} from '../shared/ipcEventNames';
import {FetchService} from './api/fetchService';
import {Configuration} from './configuration/configuration';
import {AuthenticatorService} from './oauth/authenticatorService';
import {AuthenticatorServiceImpl} from './oauth/authenticatorServiceImpl';
import {HttpProxy} from './utilities/httpProxy';
import {UrlParser} from './utilities/urlParser';

/*
 * A class that deals with IPC events of the main side of the app
 */
export class IpcMainEvents {

    private readonly configuration: Configuration;
    private readonly httpProxy: HttpProxy;
    private readonly authenticatorService: AuthenticatorService;
    private readonly fetchService: FetchService;
    private window: BrowserWindow | null;
    private deepLinkStartupPath: string | null;

    public constructor(configuration: Configuration) {

        this.configuration = configuration;
        this.httpProxy = new HttpProxy(this.configuration.app.useProxy, this.configuration.app.proxyUrl);
        this.window = null;
        this.authenticatorService = new AuthenticatorServiceImpl(this.configuration.oauth, this.httpProxy);
        this.fetchService = new FetchService(this.configuration, this.authenticatorService, this.httpProxy);
        this.deepLinkStartupPath = null;
        this.setupCallbacks();
    }

    /*
     * Store the deep link startup URL if applicable
     */
    public set deepLinkStartupUrl(startupUrl: string) {
        this.deepLinkStartupPath = startupUrl.replace(this.configuration.oauth.privateSchemeName + ':', '');
    }

    /*
     * Store the window, load tokens and register to receive IPC messages from the renderer process
     */
    public register(window: BrowserWindow): void {

        this.window = window;
        this.authenticatorService.initialise();

        ipcMain.handle(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, this.getDeepLinkStartupPath);
        ipcMain.handle(IpcEventNames.ON_GET_COMPANIES, this.onGetCompanyList);
        ipcMain.handle(IpcEventNames.ON_GET_TRANSACTIONS, this.onGetCompanyTransactions);
        ipcMain.handle(IpcEventNames.ON_GET_OAUTH_USER_INFO, this.onGetOAuthUserInfo);
        ipcMain.handle(IpcEventNames.ON_GET_API_USER_INFO, this.onGetApiUserInfo);
        ipcMain.handle(IpcEventNames.ON_IS_LOGGED_IN, this.onIsLoggedIn);
        ipcMain.handle(IpcEventNames.ON_LOGIN, this.onLogin);
        ipcMain.handle(IpcEventNames.ON_LOGOUT, this.onLogout);
        ipcMain.handle(IpcEventNames.ON_TOKEN_REFRESH, this.onTokenRefresh);
        ipcMain.handle(IpcEventNames.ON_CLEAR_LOGIN_STATE, this.onClearLoginState);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, this.onExpireAccessToken);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, this.onExpireRefreshToken);
    }

    /*
     * When the main side of the Electron app receives a deep link it may notify the renderer
     */
    public handleDeepLink(deepLinkUrl: string): boolean {

        // Handle OAuth login or logout responses
        if (this.authenticatorService.handleDeepLink(deepLinkUrl)) {
            return true;
        }

        // If not handled, notify the React app, which will update its hash location based on the path
        const url = UrlParser.tryParse(deepLinkUrl);
        if (url && url.pathname) {
            const path = url.pathname.replace(this.configuration.oauth.privateSchemeName + ':', '');
            this.window?.webContents.send(IpcEventNames.ON_DEEP_LINK, {data: path});
        }

        return false;
    }

    /*
     * The renderer calls main to ask it the app was started via a deep link
     */
    private getDeepLinkStartupPath(event: IpcMainInvokeEvent): Promise<string> {

        return this.handleNonAsyncOperation(
            event,
            IpcEventNames.ON_DEEP_LINK_STARTUP_PATH,
            () => this.deepLinkStartupPath);
    }

    /*
     * Make an API request to get companies
     */
    private async onGetCompanyList(event: IpcMainInvokeEvent, args: any): Promise<Company[]> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_GET_COMPANIES,
            () => this.fetchService.getCompanyList(args.options));
    }

    /*
     * Make an API request to get transactions
     */
    private async onGetCompanyTransactions(event: IpcMainInvokeEvent, args: any): Promise<CompanyTransactions> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_GET_TRANSACTIONS,
            () => this.fetchService.getCompanyTransactions(args.id, args.options));
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async onGetOAuthUserInfo(event: IpcMainInvokeEvent, args: any): Promise<any> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_GET_OAUTH_USER_INFO,
            () => this.fetchService.getOAuthUserInfo(args.options));
    }

    /*
     * Make an API request to get API user info
     */
    private async onGetApiUserInfo(event: IpcMainInvokeEvent, args: any): Promise<OAuthUserInfo> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_GET_API_USER_INFO,
            () => this.fetchService.getApiUserInfo(args.options));
    }

    /*
     * See if there are any tokens
     */
    private async onIsLoggedIn(event: IpcMainInvokeEvent): Promise<ApiUserInfo> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_IS_LOGGED_IN,
            () => this.authenticatorService.isLoggedIn());
    }

    /*
     * Run a login redirect on the system browser
     */
    private async onLogin(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_LOGIN,
            () => this.authenticatorService.login());
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async onLogout(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_LOGOUT,
            () => this.authenticatorService.logout());
    }

    /*
     * Perform token refresh
     */
    private async onTokenRefresh(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            IpcEventNames.ON_TOKEN_REFRESH,
            () => this.authenticatorService.tokenRefresh());
    }

    /*
     * Clear login state after certain errors
     */
    private async onClearLoginState(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            IpcEventNames.ON_CLEAR_LOGIN_STATE,
            () => this.authenticatorService.clearLoginState());
    }

    /*
     * For testing, make the access token act expired
     */
    private async onExpireAccessToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            IpcEventNames.ON_EXPIRE_ACCESS_TOKEN,
            () => this.authenticatorService.expireAccessToken());
    }

    /*
     * For testing, make the refresh token act expired
     */
    private async onExpireRefreshToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            IpcEventNames.ON_EXPIRE_REFRESH_TOKEN,
            () => this.authenticatorService.expireRefreshToken());
    }

    /*
     * Run an async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async handleAsyncOperation(
        event: IpcMainInvokeEvent,
        name: string,
        action: () => Promise<any>): Promise<any> {

        try {

            if (!event.senderFrame.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = await action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            this.logError(name, error);
            return {
                data: null,
                error: error.toJson()
            };
        }
    }

    /*
     * Run a non-async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async handleNonAsyncOperation(
        event: IpcMainInvokeEvent,
        name: string,
        action: () => any): Promise<any> {

        try {
            if (!event.senderFrame.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            this.logError(name, error);
            return {
                data: null,
                error: error.toJson()
            };
        }
    }

    /*
     * Output some basic details to the console
     */
    private async logError(name: string, error: UIError) {

        if (IS_DEBUG) {

            let info = `Main ${name} error`;

            const statusCode = error.getStatusCode();
            if (statusCode) {
                info += `, status: ${statusCode}`;
            }

            info += `, code: ${error.getErrorCode()}`;
            const details = error.getDetails();
            if (details) {
                info += `, message: ${details}`;
            } else if (error.message) {
                info += `, message: ${error.message}`;
            }

            console.log(info);
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {

        this.onGetCompanyList = this.onGetCompanyList.bind(this);
        this.onGetCompanyTransactions = this.onGetCompanyTransactions.bind(this);
        this.onGetOAuthUserInfo = this.onGetOAuthUserInfo.bind(this);
        this.onGetApiUserInfo = this.onGetApiUserInfo.bind(this);
        this.onIsLoggedIn = this.onIsLoggedIn.bind(this);
        this.onLogin = this.onLogin.bind(this);
        this.onLogout = this.onLogout.bind(this);
        this.onTokenRefresh = this.onTokenRefresh.bind(this);
        this.onClearLoginState = this.onClearLoginState.bind(this);
        this.onExpireAccessToken = this.onExpireAccessToken.bind(this);
        this.onExpireRefreshToken = this.onExpireRefreshToken.bind(this);
        this.getDeepLinkStartupPath = this.getDeepLinkStartupPath.bind(this);
    }
}
