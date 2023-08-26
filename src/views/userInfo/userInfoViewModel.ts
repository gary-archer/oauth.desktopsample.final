import EventBus from 'js-event-bus';
import {FetchCacheKeys} from '../../api/client/fetchCacheKeys';
import {FetchClient} from '../../api/client/fetchClient';
import {ApiUserInfo} from '../../api/entities/apiUserInfo';
import {OAuthUserInfo} from '../../api/entities/oauthUserInfo';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {UIError} from '../../plumbing/errors/uiError';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {ViewModelCoordinator} from '../utilities/viewModelCoordinator';

/*
 * The view model for the user info view
 */
export class UserInfoViewModel {

    private readonly _apiClient: FetchClient;
    private readonly _eventBus: EventBus;
    private readonly _viewModelCoordinator: ViewModelCoordinator;
    private _oauthUserInfo: OAuthUserInfo | null;
    private _apiUserInfo: ApiUserInfo | null;
    private _error: UIError | null;

    public constructor(
        apiClient: FetchClient,
        eventBus: EventBus,
        viewModelCoordinator: ViewModelCoordinator,
    ) {
        this._apiClient = apiClient;
        this._eventBus = eventBus;
        this._viewModelCoordinator = viewModelCoordinator;
        this._oauthUserInfo = null;
        this._apiUserInfo = null;
        this._error = null;
    }

    /*
     * Property accessors
     */
    public get oauthUserInfo(): OAuthUserInfo | null {
        return this._oauthUserInfo;
    }

    public get apiUserInfo(): ApiUserInfo | null {
        return this._apiUserInfo;
    }

    public get error(): UIError | null {
        return this._error;
    }

    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Get data from the API, and trigger a new login only once when the session expires
     */
    public async callApi(options?: ViewLoadOptions): Promise<void> {

        const oauthFetchOptions = {
            cacheKey: FetchCacheKeys.OAuthUserInfo,
            forceReload: options?.forceReload || false,
            causeError: options?.causeError || false,
        };

        const apiFetchOptions = {
            cacheKey: FetchCacheKeys.ApiUserInfo,
            forceReload: options?.forceReload || false,
            causeError: options?.causeError || false,
        };

        this._viewModelCoordinator.onUserInfoViewModelLoading();

        try {

            this._error = null;
            this._oauthUserInfo = null;
            this._apiUserInfo = null;

            // Set up promises for the two sources of user info
            const oauthUserInfoPromise = this._apiClient.getOAuthUserInfo(oauthFetchOptions);
            const apiUserInfoPromise = this._apiClient.getApiUserInfo(apiFetchOptions);

            // Run the tasks in parallel
            const results = await Promise.all([oauthUserInfoPromise, apiUserInfoPromise]);
            const oauthUserInfo = results[0];
            const apiUserInfo = results[1];

            // Update data
            if (oauthUserInfo) {
                this._oauthUserInfo = oauthUserInfo;
            }
            if (apiUserInfo) {
                this._apiUserInfo = apiUserInfo;
            }

            // Send a notification if any data loaded
            if (oauthUserInfo || apiUserInfo) {
                this._viewModelCoordinator.onUserInfoViewModelLoaded();
            }

        } catch (e: any) {

            // Report errors
            this._error = ErrorFactory.fromException(e);
            this._oauthUserInfo = null;
            this._apiUserInfo = null;

            // Send a notification if there was an error
            this._viewModelCoordinator.onUserInfoViewModelLoaded();
        }
    }

    /*
     * Reset state when logging out
     */
    public unload(): void {
        this._oauthUserInfo = null;
        this._apiUserInfo = null;
        this._error = null;
    }
}
