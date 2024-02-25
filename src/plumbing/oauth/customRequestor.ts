import axios, {AxiosRequestConfig, Method} from 'axios';
import {Requestor} from '@openid/appauth';
import {ErrorFactory} from '../errors/errorFactory';
import {AxiosUtils} from '../utilities/axiosUtils';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * Override the requestor object of AppAuthJS, so that OAuth error codes are returned
 */
export class CustomRequestor extends Requestor {

    private readonly _httpProxy: HttpProxy;

    public constructor(httpProxy: HttpProxy) {
        super();
        this._httpProxy = httpProxy;
    }

    /*
     * Run the request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {

            // Configure and send the request
            const options: AxiosRequestConfig = {
                url: settings.url,
                method: settings.method as Method,
                data: settings.data,
                headers: settings.headers as any,
            };

            if (this._httpProxy.agent) {
                options.httpsAgent = this._httpProxy.agent;
            }

            const response = await axios.request(options);

            // All messages use a JSON response
            AxiosUtils.checkJson(response.data);
            return response.data as T;

        } catch (e: any) {

            // If the response is an OAuth error object from the Authorization Server then throw that
            if (e.response && e.response.data) {
                throw e.response.data;
            }

            // Otherwise throw the technical error details
            throw ErrorFactory.fromHttpError(e, settings.url || '', 'authorization server');
        }
    }
}
