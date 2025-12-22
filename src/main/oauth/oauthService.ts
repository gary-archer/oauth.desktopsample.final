/*
 * An interface to represent OAuth related operations on the main side of the app
 */
export interface OAuthService {

    // Do initial startup
    initialise(): void;

    // Get ID token claims if logged in
    getSession(): Promise<any>;

    // Use the user info endpoint from metadata for API calls
    getUserInfoEndpoint(): Promise<string | null>;

    // Try to get an access token
    getAccessToken(): string | null;

    // Try to refresh tokens
    tokenRefresh(): Promise<void>;

    // Run the login on the system browser and get ID token claims
    login(): Promise<any>;

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
