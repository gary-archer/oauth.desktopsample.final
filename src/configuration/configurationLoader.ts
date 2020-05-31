import fs from 'fs-extra';
import {Configuration} from './configuration';

/*
 * Load the desktop configuration file
 */
export class ConfigurationLoader {

    /*
     * Load configuration asynchronously within the renderer process
     */
    public static async load(fileName: string): Promise<Configuration> {

        const configurationBuffer = await fs.readFile(fileName);
        return JSON.parse(configurationBuffer.toString()) as Configuration;
    }
}
