import {ipcRenderer} from 'electron';
import fs from 'fs-extra';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {Configuration} from './configuration';

/*
 * Load the desktop configuration file
 */
export class ConfigurationLoader {

    /*
     * Load configuration asynchronously within the renderer process
     */
    public static async load(fileName: string): Promise<Configuration> {

        return new Promise<Configuration>((resolve, reject) => {

            // Get the current folder from the main side of the app
            ipcRenderer.send(ApplicationEventNames.ON_GET_APP_LOCATION, {});
            ipcRenderer.on(ApplicationEventNames.ON_GET_APP_LOCATION, async (event: any, currentFolder: any) => {

                // Load the configuration file at this location
                const configurationBuffer = await fs.readFile(`${currentFolder}/${fileName}`);
                const configuration = JSON.parse(configurationBuffer.toString()) as Configuration;
                resolve(configuration);
            });
        });
    }
}
