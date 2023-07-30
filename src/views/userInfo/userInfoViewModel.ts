import EventBus from 'js-event-bus';
import {ApiClient} from '../../api/client/apiClient';
import {Authenticator} from '../../plumbing/oauth/authenticator';
import {OAuthUserInfo} from '../../plumbing/oauth/oauthUserInfo';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {UIError} from '../../plumbing/errors/uiError';
import {ApiViewEvents} from '../utilities/apiViewEvents';
import {ApiViewNames} from '../utilities/apiViewNames';
import {UserInfoLoadOptions}  from './userInfoLoadOptions';
import {ApiUserInfo} from '../../api/entities/apiUserInfo';

/*
 * The view model for the user info view
 */
export class UserInfoViewModel {

    private readonly _authenticator: Authenticator;
    private readonly _apiClient: ApiClient;
    private readonly _eventBus: EventBus;
    private readonly _apiViewEvents: ApiViewEvents;
    private _isLoaded: boolean;

    public constructor(
        authenticator: Authenticator,
        apiClient: ApiClient,
        eventBus: EventBus,
        apiViewEvents: ApiViewEvents,
    ) {
        this._authenticator = authenticator;
        this._apiClient = apiClient;
        this._eventBus = eventBus;
        this._apiViewEvents = apiViewEvents;
        this._isLoaded = false;
    }

    /*
     * Property accessors
     */
    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Get userinfo and then notify the view
     */
    public async callApi(
        onSuccess: (oauthUserInfo: OAuthUserInfo, apiUserInfo: ApiUserInfo) => void,
        onError: (error: UIError) => void,
        options: UserInfoLoadOptions): Promise<void> {

        // Return early if no load is needed
        if (this._isLoaded && !options.reload) {
            this._apiViewEvents.onViewLoaded(ApiViewNames.UserInfo);
            return;
        }

        try {

            this._apiViewEvents.onViewLoading(ApiViewNames.UserInfo);
            const requestOptions = {causeError: options.causeError};

            // The UI can get OAuth user info from both the authorization server
            const oauthUserInfo = await this._authenticator.getUserInfo();

            // The UI can also get domain specific user info from the API
            const apiUserInfo = await this._apiClient.getUserInfo(requestOptions);

            this._apiViewEvents.onViewLoaded(ApiViewNames.UserInfo);
            this._isLoaded = true;
            onSuccess(oauthUserInfo, apiUserInfo);

        } catch (e: any) {

            this._isLoaded = false;
            const error = ErrorFactory.fromException(e);
            this._apiViewEvents.onViewLoadFailed(ApiViewNames.UserInfo, error);
            onError(error);
        }
    }

    /*
     * Reset state when logging out
     */
    public unload(): void {
        this._isLoaded = false;
    }
}
