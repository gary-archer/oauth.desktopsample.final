/*
 * An interface to represent OAuth related operations on the main side of the app
 */
export interface AuthenticatorService {

    // Do initial startup
    initialise(): void;

    // Query if logged in
    isLoggedIn(): Promise<boolean>;

    // Use the user info endpoint from metadata for API calls
    getUserInfoEndpoint(): Promise<string | null>;

    // Try to get an access token
    getAccessToken(): string | null;

    // Try to refresh tokens
    tokenRefresh(): Promise<void>;

    // Run the login on the system browser
    login(): Promise<void>;

    // Run the logout on the system browser
    logout(): Promise<void>;

    // Process any deep links that are OAuth responses
    handleDeepLink(deepLinkUrl: string): boolean;

    // Allow the app to clear its login state after certain errors
    clearLoginState(): void;

    // For testing, make the access token act expired
    expireAccessToken(): void;

    // For testing, make the refresh token act expired
    expireRefreshToken(): void;
}
