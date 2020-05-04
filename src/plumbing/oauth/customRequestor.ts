import {Requestor} from '@openid/appauth';
import got from 'got';
import {ErrorHandler} from '../errors/errorHandler';
import {DebugProxyAgent} from '../utilities/debugProxyAgent';

/*
 * Override the requestor object of AppAuthJS, so that OAuth error codes are returned
 */
export class CustomRequestor extends Requestor {

    /*
     * Run the request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {

            // Set base options
            const options: any = {
                method: settings.method,
                agent: DebugProxyAgent.get(),
            };

            // Send data if required
            if (settings.data) {
                options.body = settings.data;
            }

            // Forward headers
            if (settings.headers) {
                options.headers = settings.headers;
            }

            // Make the request and all requests use a JSON response
            const response = await got(settings.url, options);
            return JSON.parse(response.body) as T;

        } catch (e) {

            // If the response is an OAuth error object from the Authorization Server then throw that
            if (e.body) {
                throw JSON.parse(e.body);
            }

            // Otherwise throw the technical error details
            throw ErrorHandler.getFromApiError(e, settings.url || '');
        }
    }
}
