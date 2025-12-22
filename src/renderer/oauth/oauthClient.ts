/*
 * OAuth related operations initiated by the renderer side of the app
 */
export interface OAuthClient {

    // See if logged in and get ID token claims
    getSession(): Promise<any>;

    // Allow the frontend to ask for the login status
    isLoggedIn(): boolean;

    // Do the login and get ID token claims
    login(): Promise<any>;

    // Get the delegation ID claim
    getDelegationId(): string;

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
