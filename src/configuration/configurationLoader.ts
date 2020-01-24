import fs from 'fs-extra';
import {Configuration} from './configuration';

/*
 * Load the desktop configuration file
 */
export class ConfigurationLoader {

    /*
     * We download user info from the API so that we can get any data we need
     */
    public static async load(fileName: string): Promise<Configuration> {

        const filePath = `${__dirname}/../../${fileName}`;
        const configurationBuffer = await fs.readFile(filePath);
        return JSON.parse(configurationBuffer.toString()) as Configuration;
    }
}
