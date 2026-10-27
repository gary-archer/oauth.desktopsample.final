import EventBus from 'js-event-bus';
import {ApiUserInfo} from '../../../shared/api/apiUserInfo';
import {Company} from '../../../shared/api/company';
import {CompanyTransactions} from '../../../shared/api/companyTransactions';
import {GetOptions} from '../../../shared/api/getOptions';
import {OAuthUserInfo} from '../../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../../shared/errors/errorFactory';
import {IpcRendererEvents} from '../../ipcRendererEvents';
import {OAuthClient} from '../../oauth/oauthClient';
import {FetchCache} from '../cache/fetchCache';
import {ApiRequestCoordinator} from './apiRequestCoordinator';

/*
 * API operations from the renderer side of the app
 */
export class ApiClient {

    private readonly fetchCache: FetchCache;
    private readonly ipcEvents: IpcRendererEvents;
    private readonly oauthClient: OAuthClient;
    private readonly requestCoordinator: ApiRequestCoordinator;

    public constructor(ipcEvents: IpcRendererEvents, oauthClient: OAuthClient, eventBus: EventBus) {

        this.ipcEvents = ipcEvents;
        this.oauthClient = oauthClient;
        this.fetchCache = new FetchCache();
        this.requestCoordinator = new ApiRequestCoordinator(eventBus);
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(options: GetOptions) : Promise<Company[] | null> {

        const path = '/companies';
        return await this.getDataFromApi(path, options, () => this.ipcEvents.getCompanyList(options));
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: GetOptions) : Promise<CompanyTransactions | null> {

        const path = `/transactions/${id}`;
        return await this.getDataFromApi(path, options, () => this.ipcEvents.getCompanyTransactions(id, options));
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: GetOptions) : Promise<OAuthUserInfo | null> {

        const path = '/oauthuserinfo';
        return await this.getDataFromApi(path, options, () => this.ipcEvents.getOAuthUserInfo(options));
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo(options: GetOptions) : Promise<ApiUserInfo | null> {

        const path = '/apiuserinfo';
        return await this.getDataFromApi(path, options, () => this.ipcEvents.getApiUserInfo(options));
    }

    /*
     * Return the overall status after a batch of concurrent API requests complete
     */
    public hasErrors(): boolean {
        return this.requestCoordinator.hasErrors();
    }

    /*
     * Clear any API state when the user logs out
     */
    public clearLoginState(): void {
        this.fetchCache.clearAll();
        this.requestCoordinator.resetState();
    }

    /*
     * The entry point to get data deals with caching
     */
    private async getDataFromApi(path: string, options: GetOptions, callback: () => Promise<any>): Promise<any> {

        // Remove the item from the cache when a reload is requested
        if (options.forceReload) {
            this.fetchCache.removeItem(path);
        }

        // Return existing data from the memory cache when available
        let cacheItem = this.fetchCache.getItem(path);
        if (cacheItem) {
            return cacheItem.getData();
        }

        // Create the cache item with a null value, so that extra strict mode requests return null
        cacheItem = this.fetchCache.createItem(path);

        // Notify the request coordinator that we are sending an API request
        this.requestCoordinator.onApiRequestStart();

        try {

            // Get the data and update the cache item for this request
            const result = await this.callApiWithTokenRefresh(callback);
            cacheItem.setData(result);
            this.requestCoordinator.onApiRequestEnd();
            return result;

        } catch (e: any) {

            // Make sure we clear the item from the cache
            this.fetchCache.removeItem(path);

            // Handle the error and notify the request coordinator that the API request failed
            const error = ErrorFactory.fromException(e);
            this.requestCoordinator.onApiRequestEnd(error);
            throw error;
        }
    }

    /*
     * A standard algorithm for token refresh
     */
    private async callApiWithTokenRefresh(callback: () => Promise<any>): Promise<any> {

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
