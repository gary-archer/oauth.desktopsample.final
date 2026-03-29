import {fetch, HeadersInit, RequestInit} from 'undici';
import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {FetchOptions} from '../../shared/api/fetchOptions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {Configuration} from '../configuration/configuration';
import {OAuthService} from '../oauth/oauthService';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * API operations from the main side of the app
 */
export class FetchService {

    private readonly configuration: Configuration;
    private readonly oauthService: OAuthService;
    private readonly httpProxy: HttpProxy;

    public constructor(
        configuration: Configuration,
        oauthService: OAuthService,
        httpProxy: HttpProxy) {

        this.configuration = configuration;
        this.oauthService = oauthService;
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

        const url = await this.oauthService.getUserInfoEndpoint();
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
        method: string,
        url: string,
        fetchOptions: FetchOptions,
        dataToSend: any = null): Promise<any> {

        try {

            const accessToken = this.oauthService.getAccessToken();
            if (!accessToken) {
                throw ErrorFactory.fromLoginRequired();
            }

            const headers: HeadersInit = {
                'authorization': `Bearer ${accessToken}`,
                'accept': 'application/json',
                'correlation-id': crypto.randomUUID(),
            };

            if (fetchOptions.causeError) {
                headers['api-exception-simulation'] = 'FinalApi';
            }

            const options: RequestInit = {
                method,
                headers,
                dispatcher: this.httpProxy.getDispatcher() || undefined,
            };

            if (dataToSend) {
                headers['content-type'] = 'application/json';
                options.body = JSON.stringify(dataToSend);
            }

            const response = await fetch(url, options);
            if (response.ok) {
                return await response.json();
            }

            throw await ErrorFactory.getFromApiResponseError(response);

        } catch (e: any) {

            throw ErrorFactory.getFromFetchError(e, url, 'web API');
        }
    }
}
