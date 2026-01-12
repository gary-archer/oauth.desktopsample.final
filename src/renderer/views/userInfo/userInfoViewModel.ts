import EventBus from 'js-event-bus';
import {ApiUserInfo} from '../../../shared/api/apiUserInfo';
import {OAuthUserInfo} from '../../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../../shared/errors/errorFactory';
import {UIError} from '../../../shared/errors/uiError';
import {FetchCacheKeys} from '../../api/fetchCacheKeys';
import {FetchClient} from '../../api/fetchClient';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {ViewModelCoordinator} from '../utilities/viewModelCoordinator';

/*
 * The view model for the user info view
 */
export class UserInfoViewModel {

    private readonly fetchClient: FetchClient;
    private readonly eventBus: EventBus;
    private readonly viewModelCoordinator: ViewModelCoordinator;
    private oauthUserInfo: OAuthUserInfo | null;
    private apiUserInfo: ApiUserInfo | null;
    private error: UIError | null;

    public constructor(
        fetchClient: FetchClient,
        eventBus: EventBus,
        viewModelCoordinator: ViewModelCoordinator,
    ) {
        this.fetchClient = fetchClient;
        this.eventBus = eventBus;
        this.viewModelCoordinator = viewModelCoordinator;
        this.oauthUserInfo = null;
        this.apiUserInfo = null;
        this.error = null;
    }

    /*
     * Property accessors
     */
    public getOAuthUserInfo(): OAuthUserInfo | null {
        return this.oauthUserInfo;
    }

    public getApiUserInfo(): ApiUserInfo | null {
        return this.apiUserInfo;
    }

    public getError(): UIError | null {
        return this.error;
    }

    public getEventBus(): EventBus {
        return this.eventBus;
    }

    /*
     * Get data from the API and then notify the caller
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

        this.viewModelCoordinator.onUserInfoViewModelLoading();
        this.error = null;

        try {

            // Set up promises for the two sources of user info
            const oauthUserInfoPromise = this.fetchClient.getOAuthUserInfo(oauthFetchOptions);
            const apiUserInfoPromise = this.fetchClient.getApiUserInfo(apiFetchOptions);

            // Run the tasks in parallel
            const results = await Promise.all([oauthUserInfoPromise, apiUserInfoPromise]);
            const oauthUserInfo = results[0];
            const apiUserInfo = results[1];

            // Update data
            if (oauthUserInfo) {
                this.oauthUserInfo = oauthUserInfo;
            }
            if (apiUserInfo) {
                this.apiUserInfo = apiUserInfo;
            }

        } catch (e: any) {

            this.error = ErrorFactory.fromException(e);
            this.oauthUserInfo = null;
            this.apiUserInfo = null;

        } finally {

            await this.viewModelCoordinator.onUserInfoViewModelLoaded();
        }
    }

    /*
     * Unload when the user navigates to login required
     */
    public unload(): void {
        this.error = null;
        this.oauthUserInfo = null;
        this.apiUserInfo = null;
    }
}
