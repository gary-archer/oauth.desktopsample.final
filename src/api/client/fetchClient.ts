import axios, {AxiosRequestConfig, Method} from 'axios';
import {Guid} from 'guid-typescript';
import {Company} from '../entities/company';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {CompanyTransactions} from '../entities/companyTransactions';
import {OAuthUserInfo} from '../entities/oauthUserInfo';
import {Configuration} from '../../configuration/configuration';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {AuthenticatorClient} from '../../plumbing/oauth/authenticatorClient';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';
import {FetchCache} from './fetchCache';
import {FetchOptions} from './fetchOptions';

/*
 * A high level class used by the rest of the app to fetch secured data from APIs
 */
export class FetchClient {

    private readonly _configuration: Configuration;
    private readonly _fetchCache: FetchCache;
    private readonly _authenticatorClient: AuthenticatorClient;
    private readonly _sessionId: string;

    public constructor(
        configuration: Configuration,
        fetchCache: FetchCache,
        authenticatorClient: AuthenticatorClient) {

        this._configuration = configuration;
        this._fetchCache = fetchCache;
        this._authenticatorClient = authenticatorClient;
        this._sessionId = Guid.create().toString();
    }

    /*
     * Return the session ID for display
     */
    public get sessionId(): string {
        return this._sessionId;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(options: FetchOptions) : Promise<Company[] | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies`;
        return this._callApi('GET', url, options);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return this._callApi('GET', url, options);
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {

        const url = await this._authenticatorClient.getUserInfoEndpoint();
        if (!url) {
            return null;
        }

        const data = await this._callApi('GET', url, options);
        if (!data) {
            return null;
        }

        return {
            givenName: data['given_name'] || '',
            familyName: data['family_name'] || '',
        };
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo(options: FetchOptions) : Promise<ApiUserInfo | null> {

        const url = `${this._configuration.app.apiBaseUrl}/userinfo`;
        return this._callApi('GET', url, options);
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _callApi(
        method: Method,
        url: string,
        options: FetchOptions,
        dataToSend: any = null): Promise<any> {

        // Remove the item from the cache when a reload is requested
        if (options.forceReload) {
            this._fetchCache.removeItem(options.cacheKey);
        }

        // Return existing data from the memory cache when available
        // If a view is created whiles its API requests are in flight, this returns null to the view model
        let cacheItem = this._fetchCache.getItem(options.cacheKey);
        if (cacheItem && !cacheItem.error) {
            return cacheItem.data;
        }

        // Ensure that the cache item exists, to avoid further redundant API requests
        cacheItem = this._fetchCache.createItem(options.cacheKey);

        // Get the access token and trigger a login redirect if not found
        let accessToken = await this._authenticatorClient.getAccessToken();
        if (!accessToken) {

            const loginRequiredError = ErrorFactory.fromLoginRequired();
            cacheItem.error = loginRequiredError;
            throw loginRequiredError;
        }

        try {

            // Call the API and return data on success
            const data1 = await this._callApiWithAccessToken(method, url, accessToken, options, dataToSend);
            cacheItem.data = data1;
            return data1;

        } catch (e1: any) {

            const error1 = ErrorFactory.fromHttpError(e1, url, 'API');
            if (error1.statusCode !== 401) {

                // Report errors if this is not a 401
                cacheItem.error = error1;
                throw error1;
            }

            try {
                // Try to refresh the access token
                accessToken = await this._authenticatorClient.synchronizedRefresh();

            } catch (e2: any) {

                // Report refresh errors
                const error2 = ErrorFactory.fromHttpError(e2, url, 'API');
                cacheItem.error = error2;
                throw error2;
            }

            try {

                // Call the API again with the rewritten access token
                const data2 = await this._callApiWithAccessToken(method, url, accessToken, options, dataToSend);
                cacheItem.data = data2;
                return data2;

            }  catch (e3: any) {

                // Report retry errors
                const error3 = ErrorFactory.fromHttpError(e3, url, 'API');
                cacheItem.error = error3;
                throw error3;
            }
        }
    }

    /*
     * Do the work of calling the API
     */
    private async _callApiWithAccessToken(
        method: Method,
        url: string,
        accessToken: string,
        fetchOptions: FetchOptions,
        dataToSend: any): Promise<any> {

        const headers: any = {

            // The required authorization header
            'Authorization': `Bearer ${accessToken}`,

            // Context headers included in API logs
            'x-mycompany-api-client':     'FinalDesktopApp',
            'x-mycompany-session-id':     this._sessionId,
            'x-mycompany-correlation-id': Guid.create().toString(),
        };

        // A special header can be sent to ask the API to throw a simulated exception
        if (fetchOptions.causeError) {
            headers['x-mycompany-test-exception'] = 'SampleApi';
        }

        const requestOptions = {
            url,
            method,
            data: dataToSend,
            headers,
        } as AxiosRequestConfig;

        const response = await axios.request(requestOptions);
        AxiosUtils.checkJson(response.data);
        return response.data;
    }
}
