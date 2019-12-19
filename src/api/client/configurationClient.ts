import axios from 'axios';
import {Configuration} from '../../configuration/configuration';
import {ErrorHandler} from '../../plumbing/errors/errorHandler';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';

/*
 * Logic related to making HTTP calls
 */
export class ConfigurationClient {

    /*
     * Download JSON data from the app config file
     */
    public async download(url: string): Promise<Configuration> {

        try {

            // Make the remote call
            const response = await axios.get<Configuration>(url);
            AxiosUtils.checkJson(response.data);
            return response.data;

        } catch (xhr) {

            // Capture error details
            throw ErrorHandler.getFromWebDownloadError(xhr, url);
        }
    }
}
