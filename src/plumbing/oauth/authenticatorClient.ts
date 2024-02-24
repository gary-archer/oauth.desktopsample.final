/*
 * OAuth related operations initiated by the renderer side of the app
 */
export interface AuthenticatorClient {

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Do the logout redirect and process the response
    logout(): Promise<void>;

    // Try to refresh the access token
    synchronizedRefresh(): Promise<void>;

    // Allow the app to clear its login state after certain errors
    clearLoginState(): Promise<void>;

    // For testing, make the access token act expired
    expireAccessToken(): Promise<void>;

    // For testing, make the refresh token act expired
    expireRefreshToken(): Promise<void>;
}
