import fs from 'fs-extra';
import {Configuration} from './configuration';

/*
 * Load configuration in the main process
 */
export class ConfigurationLoaderService {

    /*
     * Do the file reading work
     */
    public static async load(filePath: string): Promise<Configuration> {

        const configurationBuffer = await fs.readFile(filePath);
        return JSON.parse(configurationBuffer.toString());
    }
}
