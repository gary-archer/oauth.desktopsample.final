import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {Configuration} from './configuration';

/*
 * Load the desktop configuration file
 */
export class ConfigurationLoader {

    /*
     * Call the main side of the application to read the file system
     */
    public static async load(): Promise<Configuration> {

        // Make the remoting call
        const api = (window as any).api;
        const data = await api.sendIpcMessageAndGetResponse(ApplicationEventNames.ON_GET_CONFIGURATION, {});

        // See if there were errors
        if (data.error) {
            throw data.error;
        }

        // Return the configuration otherwise
        console.log(`Config from remote side: ${data.configuration.oauth.authority}`)
        return data.configuration;
    }
}
