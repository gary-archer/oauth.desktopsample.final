import axios, {AxiosRequestConfig, Method} from 'axios';
import {Guid} from 'guid-typescript';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {Authenticator} from '../../plumbing/oauth/authenticator';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {Company} from '../entities/company';
import {CompanyTransactions} from '../entities/companyTransactions';
import {ApiRequestOptions} from './apiRequestOptions';

/*
 * Logic related to making API calls
 */
export class ApiClient {

    private readonly _apiBaseUrl: string;
    private readonly _authenticator: Authenticator;
    private readonly _sessionId: string;

    public constructor(apiBaseUrl: string, authenticator: Authenticator) {

        this._apiBaseUrl = apiBaseUrl;
        if (!this._apiBaseUrl.endsWith('/')) {
            this._apiBaseUrl += '/';
        }

        this._authenticator = authenticator;
        this._sessionId = Guid.create().toString();
    }

    /*
     * Return the session id for display
     */
    public get sessionId(): string {
        return this._sessionId;
    }

    /*
     * Download custom claims from the API
     */
    public async getUserInfo(options?: ApiRequestOptions): Promise<ApiUserInfo> {

        return await this._callApi('userinfo', 'GET', null, options) as ApiUserInfo;
    }

    /*
     * We download user info from the API so that we can get any data we need
     */
    public async getCompanyList(options?: ApiRequestOptions): Promise<Company[]> {

        return await this._callApi('companies', 'GET', null, options) as Company[];
    }

    /*
     * We download user info from the API so that we can get any data we need
     */
    public async getCompanyTransactions(id: string, options?: ApiRequestOptions): Promise<CompanyTransactions> {

        return await this._callApi(`companies/${id}/transactions`, 'GET', null, options) as CompanyTransactions;
    }

    /*
     * A central method to get data from an API and handle 401 retries
     */
    private async _callApi(
        path: string,
        method: Method,
        dataToSend?: any,
        options?: ApiRequestOptions): Promise<any> {

        // Get the full path
        const url = `${this._apiBaseUrl}${path}`;

        // Get the access token, and if it does not exist a login redirect will be triggered
        let token = await this._authenticator.getAccessToken();

        try {

            // Call the API
            return await this._callApiWithToken(url, method, dataToSend, token, options);

        } catch (error1: any) {

            // Report Ajax errors if this is not a 401
            if (error1.statusCode !== 401) {
                throw error1;
            }

            // If we received a 401 then try to get a new token
            token = await this._authenticator.refreshAccessToken();

            // The general pattern for calling an OAuth secured API is to retry 401s once with a new token
            return await this._callApiWithToken(url, method, dataToSend, token, options);
        }
    }

    /*
     * Do the work of calling the API
     */
    private async _callApiWithToken(
        url: string,
        method: Method,
        dataToSend: any,
        accessToken: string,
        options?: ApiRequestOptions): Promise<any> {

        try {

            const axiosOptions: AxiosRequestConfig = {
                url,
                method,
                data: dataToSend,
                headers: this._getHeaders(accessToken, options),
            };

            const response = await axios.request(axiosOptions);
            AxiosUtils.checkJson(response.data);
            return response.data;

        } catch (e: any) {

            throw ErrorFactory.fromHttpError('web API', e, url);
        }
    }

    /*
     * Add headers for logging and advanced testing purposes
     */
    private _getHeaders(accessToken: any, options?: ApiRequestOptions): any {

        const headers: any = {

            // The required authorization header
            'Authorization': `Bearer ${accessToken}`,

            // Context headers included in API logs
            'x-mycompany-api-client':     'FinalDesktopApp',
            'x-mycompany-session-id':     this._sessionId,
            'x-mycompany-correlation-id': Guid.create().toString(),
        };

        // A special header can be sent to thr API to cause a simulated exception
        if (options && options.causeError) {
            headers['x-mycompany-test-exception'] = 'SampleApi';
        }

        return headers;
    }
}
