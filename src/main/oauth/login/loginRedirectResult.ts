import {AuthorizationError, AuthorizationRequest, AuthorizationResponse} from '@openid/appauth';

/*
 * The result of the login redirect on the system browser
 */
export interface LoginRedirectResult {
    request: AuthorizationRequest,
    response: AuthorizationResponse | null,
    error: AuthorizationError | null,
}
