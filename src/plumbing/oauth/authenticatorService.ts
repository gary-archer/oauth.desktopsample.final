/*
 * An interface to represent OAuth related operations on the main side of the app
 */
export interface AuthenticatorService {

    // Setup that requires async calls
    initialise(): Promise<void>;

    // Provide the user info endpoint from metadata
    getUserInfoEndpoint(): Promise<string | null>;

    // Try to get an access token
    getAccessToken(): Promise<string | null>;

    // Try to refresh the access token
    synchronizedRefresh(): Promise<string>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Do the logout redirect and process the response
    logout(): Promise<void>;

    // Allow the app to clear its login state after certain errors
    clearLoginState(): Promise<void>;

    // For testing, make the access token act expired
    expireAccessToken(): Promise<void>;

    // For testing, make the refresh token act expired
    expireRefreshToken(): Promise<void>;
}
