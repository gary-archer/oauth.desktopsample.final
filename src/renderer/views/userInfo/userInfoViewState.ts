import {ApiUserInfo} from '../../../shared/api/apiUserInfo';
import {OAuthUserInfo} from '../../../shared/api/oauthUserInfo';
import {UIError} from '../../../shared/errors/uiError';

/*
 * The snapshot of state exposed to the view
 */
export interface UserInfoViewState {
    oauthUserInfo: OAuthUserInfo | null;
    apiUserInfo: ApiUserInfo | null;
    error: UIError | null;
}
