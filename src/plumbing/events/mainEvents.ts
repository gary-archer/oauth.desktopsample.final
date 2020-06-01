import {app, BrowserWindow, ipcMain} from 'electron';
import fs from 'fs-extra';
import Opener from 'opener';
import {IpcEventNames} from './ipcEventNames';

/*
 * A class to encapsulate IPC calls on the main side of our app
 */
export class MainEvents {

    private _window: BrowserWindow | null;
    private _deepLinkStartupUrl: string | null;

    public constructor() {
        this._window = null;
        this._deepLinkStartupUrl = null;
        this._setupCallbacks();
    }

    /*
     * Set the window once available
     */
    public set window(window: BrowserWindow) {
        this._window = window;
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
        ipcMain.on(IpcEventNames.ON_GET_CONFIGURATION, this._loadConfiguration);
        ipcMain.on(IpcEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._getDeepLinkStartupUrl);
        ipcMain.on(IpcEventNames.ON_OPEN_SYSTEM_BROWSER, this._openSystemBrowser);
    }

    /*
     * When a login response or deep link is received, forward it to the renderer process
     */
    public sendPrivateSchemeNotificationUrl(url: string) {
        this._window!.webContents.send(IpcEventNames.ON_PRIVATE_URI_SCHEME_NOTIFICATION, url);
    }

    /*
     * Load the configuration data
     */
    private async _loadConfiguration(): Promise<void> {

        try {
            // Do the work of loading configuration
            const filePath = `${app.getAppPath()}/desktop.config.json`;
            const configurationBuffer = await fs.readFile(filePath);
            const configuration = JSON.parse(configurationBuffer.toString());
            this._sendResponse(IpcEventNames.ON_GET_CONFIGURATION, configuration, null);

        } catch (e) {

            // Return an error on failure
            this._sendResponse(IpcEventNames.ON_GET_CONFIGURATION, null, e);
        }
    }

    /*
     * The app could have been started via deep linking
     * In this case the renderer side of the app can send us a message to get the startup URL
     */
    private _getDeepLinkStartupUrl(): void {
        this._sendResponse(IpcEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._deepLinkStartupUrl, null);
    }

    /*
     * Open the system browser at the supplied URL
     */
    private _openSystemBrowser(...args: any[]): void {
        Opener(args[1]);
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
        this._loadConfiguration = this._loadConfiguration.bind(this);
        this._getDeepLinkStartupUrl = this._getDeepLinkStartupUrl.bind(this);
    }
}