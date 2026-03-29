import {Requestor} from '@openid/appauth';
import {fetch, RequestInit} from 'undici';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * Override the requestor object, to capture OAuth errors and to support the use of an HTTP proxy
 */
export class CustomRequestor extends Requestor {

    private readonly httpProxy: HttpProxy;

    public constructor(httpProxy: HttpProxy) {
        super();
        this.httpProxy = httpProxy;
    }

    /*
     * Run the request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        const url = settings.url || '';
        try {

            const options: RequestInit = {
                method: settings.method,
                headers: settings.headers as any,
                dispatcher: this.httpProxy.getDispatcher() || undefined,
            };

            if (typeof settings.data === 'string') {
                options.body = settings.data;
            }

            const response = await fetch(url || '', options);
            if (response.ok) {
                return await response.json() as T;
            }

            throw await ErrorFactory.getFromOAuthFetchResponseError(response);

        } catch (e: any) {

            throw ErrorFactory.getFromFetchError(e, url, 'authorization server');
        }
    }
}
