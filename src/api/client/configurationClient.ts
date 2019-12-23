import fs from 'fs-extra';
import {Configuration} from '../../configuration/configuration';
import {ErrorHandler} from '../../plumbing/errors/errorHandler';

/*
 * Logic related to loading the configuration file
 */
export class ConfigurationClient {

    /*
     * Laod the JSON data from the configuration file
     */
    public async load(url: string): Promise<Configuration> {

        try {

            // Make the remote call
            const configBuffer = await fs.readFile('desktop.config.cloudapi.json');
            return JSON.parse(configBuffer.toString()) as Configuration;

        } catch (e) {

            // Capture error details
            throw ErrorHandler.getFromFileReadError(e, url);
        }
    }
}
