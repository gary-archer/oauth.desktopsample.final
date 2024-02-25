import axios, {AxiosRequestConfig, Method} from 'axios';
import {Guid} from 'guid-typescript';
import {Company} from '../entities/company';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {CompanyTransactions} from '../entities/companyTransactions';
import {OAuthUserInfo} from '../entities/oauthUserInfo';
import {Configuration} from '../../configuration/configuration';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {AuthenticatorService} from '../../plumbing/oauth/authenticatorService';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';
import {FetchOptions} from './fetchOptions';

/*
 * API operations from the main side of the app
 */
export class FetchService {

    private readonly _configuration: Configuration;
    private readonly _authenticatorService: AuthenticatorService;

    public constructor(configuration: Configuration, authenticatorService: AuthenticatorService) {

        this._configuration = configuration;
        this._authenticatorService = authenticatorService;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(options: FetchOptions) : Promise<Company[] | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies`;
        return await this._callApi('GET', url, options);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return await this._callApi('GET', url, options);
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {

        const url = await this._authenticatorService.getUserInfoEndpoint();
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
        return await this._callApi('GET', url, options);
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _callApi(
        method: Method,
        url: string,
        options: FetchOptions,
        dataToSend: any = null): Promise<any> {

        try {

            // A logic is required if we don't have an access token
            const accessToken = await this._authenticatorService.getAccessToken();
            if (!accessToken) {
                throw ErrorFactory.fromLoginRequired();
            }

            const headers: any = {

                // The required authorization header
                'Authorization': `Bearer ${accessToken}`,

                // Context headers included in API logs
                'x-mycompany-api-client':     'FinalDesktopApp',
                'x-mycompany-session-id':     options.sessionId,
                'x-mycompany-correlation-id': Guid.create().toString(),
            };

            // A special header can be sent to ask the API to throw a simulated exception
            if (options.causeError) {
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

        } catch (e: any) {

            // Report refresh errors
            throw ErrorFactory.fromHttpError(e, url, 'API');
        }
    }
}
