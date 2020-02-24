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

        const filePath = `${__dirname}/../../${fileName}`;
        const configurationBuffer = await fs.readFile(filePath);
        return JSON.parse(configurationBuffer.toString()) as Configuration;
    }

    /*
     * Load configuration synchronously to prevent hangs in the main process
     */
    public static loadSync(fileName: string): Configuration {

        const filePath = `${__dirname}/../../${fileName}`;
        const configurationBuffer = fs.readFileSync(filePath);
        return JSON.parse(configurationBuffer.toString()) as Configuration;
    }
}
