import {Requestor} from '@openid/appauth';
import axios, {Method} from 'axios';

/*
 * Override the requestor object of AppAuthJS, so that OAuth error codes are returned
 */
export class CustomRequestor extends Requestor {

    /*
     * Run the request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {

            // Use axios to make the requests
            const response = await axios.request({
                url: settings.url,
                method: settings.method as Method,
                data: settings.data,
            });
            return response.data as T;

        } catch (e) {

            // If the response is an OAuth error object from the Authorization Server then throw that
            if (e.response && e.response.data) {
                throw e.response.data;
            }

            // Otherwise throw the technical error details
            throw e;
        }
    }
}
