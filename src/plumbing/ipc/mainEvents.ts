import {BrowserWindow, ipcMain} from 'electron';
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
    private _deepLinkStartupUrl: string | null;

    public constructor(configuration: Configuration, window: BrowserWindow) {
        this._configuration = configuration;
        this._window = window;
        this._authenticatorService = new AuthenticatorServiceImpl(this._configuration.oauth);
        this._deepLinkStartupUrl = null;
        this._setupCallbacks();
    }

    /*
     * Set a deep link startup URL if applicable
     */
    public set deepLinkStartupUrl(startupUrl: string) {
        this._deepLinkStartupUrl = startupUrl;
    }

    /*
     * Register to receive IPC messages from the renderer process
     */
    public register(): void {
        ipcMain.on(IpcEventNames.ON_LOGIN, this._onLogin);
        ipcMain.on(IpcEventNames.ON_LOGOUT, this._onLogout);
        ipcMain.on(IpcEventNames.ON_GET_CONFIGURATION, this._getConfiguration);
        ipcMain.on(IpcEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._getDeepLinkStartupUrl);
    }

    /*
     * When a login response or deep link is received, forward it to the renderer process
     */
    public sendPrivateSchemeNotificationUrl(url: string): void {
        this._window!.webContents.send(IpcEventNames.ON_PRIVATE_URI_SCHEME_NOTIFICATION, url);
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
     * Receive URL notifications from the main side of the Electron app
     */
    public handlePrivateUriSchemeNotification(privateSchemeUrl: string): boolean {

        if (this._authenticatorService.handlePrivateUriSchemeNotification(privateSchemeUrl)) {
            return true;
        }

        const url = UrlParser.tryParse(privateSchemeUrl);
        if (url && url.pathname) {

            // Otherwise we will treat it a deep linking request and update the hash location
            // this._handleDeepLinkingNotification(url.pathname);
        }

        return false;
    }

    /*
     * Return the configuration data
     */
    private async _getConfiguration(): Promise<void> {
        this._sendResponse(IpcEventNames.ON_GET_CONFIGURATION, this._configuration, null);
    }

    /*
     * The app could have been started via deep linking
     * In this case the renderer side of the app can send us a message to get the startup URL
     */
    private _getDeepLinkStartupUrl(): void {
        this._sendResponse(IpcEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._deepLinkStartupUrl, null);
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
        this._onLogin = this._onLogin.bind(this);
        this._onLogout = this._onLogout.bind(this);
        this._getConfiguration = this._getConfiguration.bind(this);
        this._getDeepLinkStartupUrl = this._getDeepLinkStartupUrl.bind(this);
    }
}
