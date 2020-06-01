import {app, BrowserWindow} from 'electron';
import fs from 'fs-extra';
import {ErrorHandler} from '../errors/errorHandler';
import {UIError} from '../errors/uiError';
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
     * Load the confioguration data
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
            const error = ErrorHandler.getFromException(e);
            this._sendResponse(ApplicationEventNames.ON_GET_CONFIGURATION, null, error);
        }
    }

    /*
     * Send the response to the renderer side of the application
     */
    private _sendResponse(eventName: string, data: any, error: UIError | null) {

        const result = {
            error,
            data,
        };
        this._window.webContents.send(eventName, result);
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.loadConfiguration = this.loadConfiguration.bind(this);
    }
}