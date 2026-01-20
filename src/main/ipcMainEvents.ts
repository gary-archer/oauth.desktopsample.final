import {BrowserWindow, ipcMain, IpcMainInvokeEvent} from 'electron';
import {ApiUserInfo} from '../shared/api/apiUserInfo';
import {Company} from '../shared/api/company';
import {CompanyTransactions} from '../shared/api/companyTransactions';
import {OAuthUserInfo} from '../shared/api/oauthUserInfo';
import {ErrorFactory} from '../shared/errors/errorFactory';
import {IpcEventNames} from '../shared/ipcEventNames';
import {FetchService} from './api/fetchService';
import {Configuration} from './configuration/configuration';
import {OAuthService} from './oauth/oauthService';
import {OAuthServiceImpl} from './oauth/oauthServiceImpl';
import {HttpProxy} from './utilities/httpProxy';
import {UrlParser} from './utilities/urlParser';

/*
 * A class that deals with IPC events of the main side of the app
 */
export class IpcMainEvents {

    private readonly configuration: Configuration;
    private readonly httpProxy: HttpProxy;
    private readonly oauthService: OAuthService;
    private readonly fetchService: FetchService;
    private window: BrowserWindow | null;
    private deepLinkStartupPath: string | null;

    public constructor(configuration: Configuration) {

        this.configuration = configuration;
        this.httpProxy = new HttpProxy(this.configuration.app.useProxy, this.configuration.app.proxyUrl);
        this.window = null;
        this.oauthService = new OAuthServiceImpl(this.configuration.oauth, this.httpProxy);
        this.fetchService = new FetchService(this.configuration, this.oauthService, this.httpProxy);
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
        this.oauthService.initialise();

        ipcMain.handle(IpcEventNames.ON_DEEP_LINK_STARTUP_PATH, this.getDeepLinkStartupPath);
        ipcMain.handle(IpcEventNames.ON_GET_COMPANIES, this.onGetCompanyList);
        ipcMain.handle(IpcEventNames.ON_GET_TRANSACTIONS, this.onGetCompanyTransactions);
        ipcMain.handle(IpcEventNames.ON_GET_OAUTH_USER_INFO, this.onGetOAuthUserInfo);
        ipcMain.handle(IpcEventNames.ON_GET_API_USER_INFO, this.onGetApiUserInfo);
        ipcMain.handle(IpcEventNames.ON_GET_SESSION, this.onGetSession);
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
        if (this.oauthService.handleDeepLink(deepLinkUrl)) {
            return true;
        }

        // If not handled, notify the React app, which will update its hash location based on the path
        const url = UrlParser.tryParse(deepLinkUrl);
        if (url && url.pathname) {
            const path = url.pathname.replace(this.configuration.oauth.privateSchemeName + ':', '');
            this.window?.webContents.send(IpcEventNames.ON_DEEP_LINK, {path});
        }

        return false;
    }

    /*
     * The renderer calls main to ask it the app was started via a deep link
     */
    private getDeepLinkStartupPath(event: IpcMainInvokeEvent): Promise<string> {

        return this.handleNonAsyncOperation(
            event,
            () => this.deepLinkStartupPath);
    }

    /*
     * Make an API request to get companies
     */
    private async onGetCompanyList(event: IpcMainInvokeEvent, args: any): Promise<Company[]> {

        return this.handleAsyncOperation(
            event,
            () => this.fetchService.getCompanyList(args.options));
    }

    /*
     * Make an API request to get transactions
     */
    private async onGetCompanyTransactions(event: IpcMainInvokeEvent, args: any): Promise<CompanyTransactions> {

        return this.handleAsyncOperation(
            event,
            () => this.fetchService.getCompanyTransactions(args.id, args.options));
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async onGetOAuthUserInfo(event: IpcMainInvokeEvent, args: any): Promise<OAuthUserInfo> {

        return this.handleAsyncOperation(
            event,
            () => this.fetchService.getOAuthUserInfo(args.options));
    }

    /*
     * Make an API request to get API user info
     */
    private async onGetApiUserInfo(event: IpcMainInvokeEvent, args: any): Promise<ApiUserInfo> {

        return this.handleAsyncOperation(
            event,
            () => this.fetchService.getApiUserInfo(args.options));
    }

    /*
     * Get ID token claims if logged in
     */
    private async onGetSession(event: IpcMainInvokeEvent): Promise<any> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.getSession());
    }

    /*
     * Run a login redirect on the system browser
     */
    private async onLogin(event: IpcMainInvokeEvent): Promise<any> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.login());
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async onLogout(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.logout());
    }

    /*
     * Perform token refresh
     */
    private async onTokenRefresh(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.tokenRefresh());
    }

    /*
     * Clear login state after certain errors
     */
    private async onClearLoginState(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.clearLoginState());
    }

    /*
     * For testing, make the access token act expired
     */
    private async onExpireAccessToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.expireAccessToken());
    }

    /*
     * For testing, make the refresh token act expired
     */
    private async onExpireRefreshToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.expireRefreshToken());
    }

    /*
     * Run an async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async handleAsyncOperation(
        event: IpcMainInvokeEvent,
        action: () => Promise<any>): Promise<any> {

        try {

            console.log('1: ' + event.senderFrame?.url);
            if (!event.senderFrame?.url.startsWith(this.configuration.oauth.privateSchemeName)) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = await action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
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
        action: () => any): Promise<any> {

        try {

            console.log('2: ' + event.senderFrame?.url);
            if (!event.senderFrame?.url.startsWith(this.configuration.oauth.privateSchemeName)) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            return {
                data: null,
                error: error.toJson()
            };
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
        this.onGetSession = this.onGetSession.bind(this);
        this.onLogin = this.onLogin.bind(this);
        this.onLogout = this.onLogout.bind(this);
        this.onTokenRefresh = this.onTokenRefresh.bind(this);
        this.onClearLoginState = this.onClearLoginState.bind(this);
        this.onExpireAccessToken = this.onExpireAccessToken.bind(this);
        this.onExpireRefreshToken = this.onExpireRefreshToken.bind(this);
        this.getDeepLinkStartupPath = this.getDeepLinkStartupPath.bind(this);
    }
}
