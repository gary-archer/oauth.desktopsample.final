import {UIError} from '../errors/uiError';

/*
 * An interface to represent authentication related operations
 */
export interface Authenticator {

    // Get whether the app has any tokens
    isLoggedIn(): Promise<boolean>;

    // Try to get an access token
    getAccessToken(): Promise<string>;

    // Start a login redirect
    startLogin(onCompleted: (error: UIError | null) => void): Promise<void>;

    // Handle a main window login response when the page loads
    startLogout(onCompleted: (error: UIError | null) => void): Promise<void>;

    // Clear the access token from HTML 5 storage
    clearAccessToken(): Promise<void>;

    // Update the access token to make it act like it is expired
    expireAccessToken(): Promise<void>;

    // Update the refresh token to make it act like it is expired
    expireRefreshToken(): Promise<void>;
}
