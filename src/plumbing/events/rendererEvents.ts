import {Configuration} from '../../configuration/configuration';
import {ApplicationEventNames} from './applicationEventNames';

/*
 * A class to encapsulate IPC calls on the renderer side of our app
 */
export class RendererEvents {

    private readonly _api: any;

    public constructor() {
        this._api = (window as any).api;
        this._setupCallbacks();
    }

    /*
     * Call the main side of the application to read the file system
     */
    public async loadConfiguration(): Promise<Configuration> {

        return await this._sendRequestReply<Configuration>(ApplicationEventNames.ON_GET_CONFIGURATION, {});
    }

    /*
     * Call the main side of the application to open the system browser
     */
    public openSystemBrowser(url: string): void {

        this._api.sendIpcMessageOneWay(ApplicationEventNames.ON_OPEN_SYSTEM_BROWSER, url);
    }

    /*
     * Register to receive IPC messages from the main process
     */
    public register(): void {

        this._api.receiveIpcMessageOneWay(
            ApplicationEventNames.ON_PRIVATE_URI_SCHEME_NOTIFICATION,
            this._handlePrivateUriSchemeNotification);
    }

    /*
     * Do the plumbing work to make the IPC call and return data
     */
    private async _sendRequestReply<T>(eventName: string, requestData: any): Promise<T> {

        const result = await this._api.sendIpcMessageRequestReply(eventName, requestData);
        if (result.error) {
            throw result.error;
        }

        return result.data as T;
    }

    /*
     * Receive URL notifications from the main side of the Electron app
     */
    private _handlePrivateUriSchemeNotification(data: any): void {
        console.log('*** RENDERER RECEIVED LOGIN RESPONSE');
        console.log(data);
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._handlePrivateUriSchemeNotification = this._handlePrivateUriSchemeNotification.bind(this);
    }
}
