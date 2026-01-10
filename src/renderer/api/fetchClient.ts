import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {FetchOptions} from '../../shared/api/fetchOptions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {OAuthClient} from '../oauth/oauthClient';
import {FetchCache} from './fetchCache';

/*
 * API operations from the renderer side of the app
 */
export class FetchClient {

    private readonly fetchCache: FetchCache;
    private readonly ipcEvents: IpcRendererEvents;
    private readonly oauthClient: OAuthClient;

    public constructor(fetchCache: FetchCache, ipcEvents: IpcRendererEvents, oauthClient: OAuthClient) {

        this.fetchCache = fetchCache;
        this.ipcEvents = ipcEvents;
        this.oauthClient = oauthClient;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(options: FetchOptions) : Promise<Company[] | null> {
        return await this.getDataFromApi(options, () => this.ipcEvents.getCompanyList(options));
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {
        return await this.getDataFromApi(options, () => this.ipcEvents.getCompanyTransactions(id, options));
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {
        return await this.getDataFromApi(options, () => this.ipcEvents.getOAuthUserInfo(options));
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo(options: FetchOptions) : Promise<ApiUserInfo | null> {
        return await this.getDataFromApi(options, () => this.ipcEvents.getApiUserInfo(options));
    }

    /*
     * The entry point to get data deals with caching
     */
    private async getDataFromApi(options: FetchOptions, callback: () => Promise<any>): Promise<any> {

        // Remove the item from the cache when a reload is requested
        console.log('*** here');
        if (options.forceReload) {
            this.fetchCache.removeItem(options.cacheKey);
        }

        // Return existing data from the memory cache when available
        // If a view is created whiles its API requests are in flight, this returns null to the view model
        let cacheItem = this.fetchCache.getItem(options.cacheKey);
        if (cacheItem && !cacheItem.getError()) {
            return cacheItem.getData();
        }

        // Ensure that the cache item exists, to avoid further redundant API requests
        cacheItem = this.fetchCache.createItem(options.cacheKey);

        try {

            // Get the data and update the cache item for this request
            const data = await this.getDataFromApiWithTokenRefresh(options, callback);
            cacheItem.setData(data);
            return data;

        } catch (e: any) {

            // Get the error and update the cache item for this request
            cacheItem.setError(e);
            throw e;
        }
    }

    /*
     * A standard algorithm for token refresh
     */
    private async getDataFromApiWithTokenRefresh(options: FetchOptions, callback: () => Promise<any>): Promise<any> {

        try {

            // Call the API and return data on success
            return await callback();

        } catch (e1: any) {

            // Report errors if this is not a 401
            const error1 = ErrorFactory.fromException(e1);
            if (error1.getStatusCode() !== 401) {
                throw error1;
            }

            // Try to refresh the access token
            await this.oauthClient.synchronizedRefresh();

            try {

                // Call the API again with the new access token
                return await callback();

            }  catch (e2: any) {

                // Report retry errors
                const error2 = ErrorFactory.fromException(e2);
                if (error2.getStatusCode() !== 401) {
                    throw error2;
                }

                // A permanent API 401 error triggers a new login.
                // This could be caused by an invalid API configuration.
                this.oauthClient.clearLoginState();
                throw ErrorFactory.fromLoginRequired();
            }
        }
    }
}
