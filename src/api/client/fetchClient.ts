import {Guid} from 'guid-typescript';
import {Company} from '../entities/company';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {CompanyTransactions} from '../entities/companyTransactions';
import {OAuthUserInfo} from '../entities/oauthUserInfo';
import {Configuration} from '../../configuration/configuration';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {FetchCache} from './fetchCache';
import {FetchOptions} from './fetchOptions';

/*
 * API operations from the renderer side of the app
 */
export class FetchClient {

    private readonly _configuration: Configuration;
    private readonly _fetchCache: FetchCache;
    private readonly _sessionId: string;

    public constructor(configuration: Configuration, fetchCache: FetchCache) {

        this._configuration = configuration;
        this._fetchCache = fetchCache;
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

        // const url = `${this._configuration.app.apiBaseUrl}/companies`;
        return this._callApi('getCompanyList', options);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {

        // const url = `${this._configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return this._callApi('getCompanyTransactions', options);
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {

        const data = await this._callApi('getOAuthUserInfo', options);
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

        // const url = `${this._configuration.app.apiBaseUrl}/userinfo`;
        return this._callApi('getApiUserInfo', options);
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _callApi(
        eventName: string,
        options: FetchOptions): Promise<any> {

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

        // TODO: call the main side of the app
        // For now I throw an error
        const loginRequiredError = ErrorFactory.fromLoginRequired();
        cacheItem.error = loginRequiredError;
        throw loginRequiredError;
    }
}
