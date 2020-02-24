import {CustomUriSchemeConfiguration} from './customUriSchemeConfiguration';

/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    redirectUri: string;
    logoutEndpoint: string;
    postLogoutRedirectUri: string;
    scope: string;
    customUriScheme: CustomUriSchemeConfiguration;
}
