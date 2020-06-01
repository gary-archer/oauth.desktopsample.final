import {Configuration} from '../../configuration/configuration';
import {ApplicationEventNames} from './applicationEventNames';

/*
 * A class to encapsulate IPC calls on the renderer side of our app
 */
export class RendererEvents {

    private readonly _api: any;

    public constructor() {
        this._api = (window as any).api;
    }

    /*
     * Call the main side of the application to read the file system
     */
    public async loadConfiguration(): Promise<Configuration> {
        return await this._getData(ApplicationEventNames.ON_GET_CONFIGURATION, {});
    }

    /*
     * Do the plumbing work to make the IPC call and return data
     */
    private async _getData(eventName: string, requestData: any): Promise<any> {

        const result = await this._api.sendIpcMessageRequestReply(eventName, requestData);
        if (result.error) {
            throw result.error;
        }

        return result.data;
    }
}
