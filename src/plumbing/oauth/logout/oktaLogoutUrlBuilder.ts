import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {LogoutUrlBuilder} from './logoutUrlBuilder';

/*
 * The standards based implementation of building a logout URL
 */
export class OktaLogoutUrlBuilder implements LogoutUrlBuilder {

    private readonly _configuration: OAuthConfiguration;
    private readonly _idToken: string;

    public constructor(configuration: OAuthConfiguration, idToken: string) {
        this._configuration = configuration;
        this._idToken = idToken;
    }

    /*
     * Form the standards based URL
     */
    public buildUrl(): string {

        const endSessionUrl = `${this._configuration.authority}/${this._configuration.logoutEndpoint}`;
        const postLogoutRedirectUri = encodeURIComponent(this._configuration.postLogoutRedirectUri);
        const encodedIdToken = encodeURIComponent(this._idToken);
        return `${endSessionUrl}?post_logout_redirect_uri=${postLogoutRedirectUri}&id_token_hint=${encodedIdToken}`;
    }
}
