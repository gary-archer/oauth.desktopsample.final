import {Guid} from 'guid-typescript';
import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {FetchOptions} from '../../shared/api/fetchOptions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {AuthenticatorClient} from '../oauth/authenticatorClient';
import {FetchCache} from './fetchCache';

/*
 * API operations from the renderer side of the app
 */
export class FetchClient {

    private readonly fetchCache: FetchCache;
    private readonly ipcEvents: IpcRendererEvents;
    private readonly authenticatorClient: AuthenticatorClient;
    private readonly sessionId: string;

    public constructor(fetchCache: FetchCache, ipcEvents: IpcRendererEvents, authenticatorClient: AuthenticatorClient) {

        this.fetchCache = fetchCache;
        this.ipcEvents = ipcEvents;
        this.authenticatorClient = authenticatorClient;
        this.sessionId = Guid.create().toString();
    }

    /*
     * Return the session ID for display
     */
    public getSessionId(): string {
        return this.sessionId;
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
     * A parameterized method containing application specific logic for managing API calls
     */
    private async getDataFromApi(options: FetchOptions, callback: () => Promise<any>): Promise<any> {

        // Remove the item from the cache when a reload is requested
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

            // Call the API and return data on success
            options.sessionId = this.sessionId;
            const data1 = await callback();
            cacheItem.setData(data1);
            return data1;

        } catch (e1: any) {

            const error1 = ErrorFactory.fromException(e1);
            if (error1.getStatusCode() !== 401) {

                // Report errors if this is not a 401
                cacheItem.setError(error1);
                throw error1;
            }

            try {

                // Try to refresh the access token
                await this.authenticatorClient.synchronizedRefresh();

            } catch (e2: any) {

                // Report refresh errors
                const error2 = ErrorFactory.fromException(e2);
                cacheItem.setError(error2);
                throw error2;
            }

            try {

                // Call the API again with the rewritten access token
                const data2 = await callback();
                cacheItem.setData(data2);
                return data2;

            }  catch (e3: any) {

                // Report retry errors
                const error3 = ErrorFactory.fromException(e3);
                cacheItem.setError(error3);
                throw error3;
            }
        }
    }
}
