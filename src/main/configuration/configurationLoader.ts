import fs from 'fs';
import {Configuration} from './configuration';

/*
 * A helper class to load configuration data
 */
export class ConfigurationLoader {

    /*
     * Load the configuration during startup of the main process
     */
    public static load(configFilePath: string): Configuration {

        const configurationJson = fs.readFileSync(configFilePath, 'utf-8');
        return JSON.parse(configurationJson);
    }
}
