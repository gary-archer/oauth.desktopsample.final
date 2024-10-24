import axios, {AxiosRequestConfig, Method} from 'axios';
import {Guid} from 'guid-typescript';
import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {FetchOptions} from '../../shared/api/fetchOptions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {Configuration} from '../configuration/configuration';
import {AuthenticatorService} from '../oauth/authenticatorService';
import {AxiosUtils} from '../utilities/axiosUtils';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * API operations from the main side of the app
 */
export class FetchService {

    private readonly configuration: Configuration;
    private readonly authenticatorService: AuthenticatorService;
    private readonly httpProxy: HttpProxy;

    public constructor(
        configuration: Configuration,
        authenticatorService: AuthenticatorService,
        httpProxy: HttpProxy) {

        this.configuration = configuration;
        this.authenticatorService = authenticatorService;
        this.httpProxy = httpProxy;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(options: FetchOptions) : Promise<Company[] | null> {

        const url = `${this.configuration.app.apiBaseUrl}/companies`;
        return await this.callApi('GET', url, options);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {

        const url = `${this.configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return await this.callApi('GET', url, options);
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {

        const url = await this.authenticatorService.getUserInfoEndpoint();
        if (!url) {
            return null;
        }

        const data = await this.callApi('GET', url, options);
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

        const url = `${this.configuration.app.apiBaseUrl}/userinfo`;
        return await this.callApi('GET', url, options);
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async callApi(
        method: Method,
        url: string,
        options: FetchOptions,
        dataToSend: any = null): Promise<any> {

        try {

            // A logic is required if we don't have an access token
            const accessToken = await this.authenticatorService.getAccessToken();
            if (!accessToken) {
                throw ErrorFactory.fromLoginRequired();
            }

            const headers: any = {

                // The required authorization header
                'Authorization': `Bearer ${accessToken}`,

                // Context headers included in API logs
                'x-authsamples-api-client':     'FinalDesktopApp',
                'x-authsamples-session-id':     options.sessionId,
                'x-authsamples-correlation-id': Guid.create().toString(),
            };

            // A special header can be sent to ask the API to throw a simulated exception
            if (options.causeError) {
                headers['x-authsamples-test-exception'] = 'FinalApi';
            }

            const requestOptions = {
                url,
                method,
                data: dataToSend,
                headers,
            } as AxiosRequestConfig;

            if (this.httpProxy.getAgent()) {
                requestOptions.httpsAgent = this.httpProxy.getAgent();
            }

            const response = await axios.request(requestOptions);
            AxiosUtils.checkJson(response.data);
            return response.data;

        } catch (e: any) {

            // Report refresh errors
            throw ErrorFactory.fromHttpError(e, url, 'API');
        }
    }
}
