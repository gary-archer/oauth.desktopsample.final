/*
 * An interface to represent authentication related operations
 */
export interface Authenticator {

    // Setup that requires async calls
    initialise(): Promise<void>;

    // Return whether we have a user object and tokens
    isLoggedIn(): Promise<boolean>;

    // Provide the user info endpoint to the fetch client
    getUserInfoEndpoint(): Promise<string>;

    // Try to get an access token
    getAccessToken(): Promise<string>;

    // Try to refresh the access token
    synchronizedRefresh(): Promise<string>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Do the logout redirect and process the response
    logout(): Promise<void>;

    // For testing, make the access token act expired
    expireAccessToken(): Promise<void>;

    // For testing, make the refresh token act expired
    expireRefreshToken(): Promise<void>;
}
