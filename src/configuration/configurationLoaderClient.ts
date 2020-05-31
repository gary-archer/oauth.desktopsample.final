import {UIError} from '../plumbing/errors/uiError';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {Configuration} from './configuration';


/*
 * A class used by the renderer process to get configuration data
 */
export class ConfigurationLoaderClient {

    /*
     * Call the main side of the application to read the file system
     */
    public static async load(): Promise<Configuration> {

        // Make the remoting call
        const api = (window as any).api;
        const data = await api.sendIpcMessageRequestReply(ApplicationEventNames.ON_GET_CONFIGURATION, {});

        // See if there were errors
        if (data.error) {
            throw data.error;
        }

        // Return the configuration otherwise
        console.log(`Config from remote side: ${data.configuration.oauth.authority}`)
        return data.configuration;
    }
}
