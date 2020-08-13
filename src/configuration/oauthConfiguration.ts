/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    logoutEndpoint: string;
    postLogoutRedirectUri: string;
    logoutCallbackPath: string;
}
