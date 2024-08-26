import {Guid} from 'guid-typescript';
import {Company} from '../entities/company';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {CompanyTransactions} from '../entities/companyTransactions';
import {OAuthUserInfo} from '../entities/oauthUserInfo';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {RendererIpcEvents} from '../../plumbing/ipc/rendererIpcEvents';
import {AuthenticatorClient} from '../../plumbing/oauth/authenticatorClient';
import {FetchCache} from './fetchCache';
import {FetchOptions} from './fetchOptions';

/*
 * API operations from the renderer side of the app
 */
export class FetchClient {

    private readonly _fetchCache: FetchCache;
    private readonly _ipcEvents: RendererIpcEvents;
    private readonly _authenticatorClient: AuthenticatorClient;
    private readonly _sessionId: string;

    public constructor(fetchCache: FetchCache, ipcEvents: RendererIpcEvents, authenticatorClient: AuthenticatorClient) {

        this._fetchCache = fetchCache;
        this._ipcEvents = ipcEvents;
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
        return await this._getDataFromApi(options, () => this._ipcEvents.getCompanyList(options));
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string, options: FetchOptions) : Promise<CompanyTransactions | null> {
        return await this._getDataFromApi(options, () => this._ipcEvents.getCompanyTransactions(id, options));
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo(options: FetchOptions) : Promise<OAuthUserInfo | null> {
        return await this._getDataFromApi(options, () => this._ipcEvents.getOAuthUserInfo(options));
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo(options: FetchOptions) : Promise<ApiUserInfo | null> {
        return await this._getDataFromApi(options, () => this._ipcEvents.getApiUserInfo(options));
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _getDataFromApi(options: FetchOptions, callback: () => Promise<any>): Promise<any> {

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

        try {

            // Call the API and return data on success
            options.sessionId = this._sessionId;
            const data1 = await callback();
            cacheItem.data = data1;
            return data1;

        } catch (e1: any) {

            const error1 = ErrorFactory.fromException(e1);
            if (error1.statusCode !== 401) {

                // Report errors if this is not a 401
                cacheItem.error = error1;
                throw error1;
            }

            try {

                // Try to refresh the access token
                await this._authenticatorClient.synchronizedRefresh();

            } catch (e2: any) {

                // Report refresh errors
                const error2 = ErrorFactory.fromException(e2);
                cacheItem.error = error2;
                throw error2;
            }

            try {

                // Call the API again with the rewritten access token
                const data2 = await callback();
                cacheItem.data = data2;
                return data2;

            }  catch (e3: any) {

                // Report retry errors
                const error3 = ErrorFactory.fromException(e3);
                cacheItem.error = error3;
                throw error3;
            }
        }
    }
}
