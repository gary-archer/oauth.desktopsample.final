import {app, BrowserWindow} from 'electron';
import log from 'electron-log';
import fs from 'fs-extra';
import Opener from 'opener';
import {ApplicationEventNames} from './applicationEventNames';

/*
 * A class to encapsulate IPC calls on the main side of our app
 */
export class MainEvents {

    private _window: BrowserWindow;

    public constructor(window: BrowserWindow) {
        this._window = window;
        this._setupCallbacks();
    }

    /*
     * Load the configuration data
     */
    public async loadConfiguration(): Promise<void> {

        try {
            // Do the work of loading configuration
            const filePath = `${app.getAppPath()}/desktop.config.json`;
            const configurationBuffer = await fs.readFile(filePath);
            const configuration = JSON.parse(configurationBuffer.toString());
            this._sendResponse(ApplicationEventNames.ON_GET_CONFIGURATION, configuration, null);

        } catch (e) {

            // Return an error on failure
            this._sendResponse(ApplicationEventNames.ON_GET_CONFIGURATION, null, e);
        }
    }

    /*
     * Open the system browser at the supplied URL
     */
    public openSystemBrowser(...args: any[]): void {
        Opener(args[1]);
    }

    /*
     * Send the response to the renderer side of the application
     */
    private _sendResponse(eventName: string, data: any, error: any) {
        this._window.webContents.send(eventName, {data, error});
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.loadConfiguration = this.loadConfiguration.bind(this);
    }
}