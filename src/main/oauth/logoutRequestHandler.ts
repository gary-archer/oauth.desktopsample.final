import {AuthorizationServiceConfiguration} from '@openid/appauth';
import EventEmitter from 'node:events';
import open from 'open';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';

/*
 * A class to handle the plumbing of logout redirects via the system browser
 */
export class LogoutRequestHandler {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _idToken: string;
    private readonly _eventEmitter: EventEmitter;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        idToken: string,
        eventEmitter: EventEmitter) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._idToken = idToken;
        this._eventEmitter = eventEmitter;
    }

    /*
     * Invoke the system browser to log the user out
     */
    public async execute(): Promise<void> {

        /* eslint-disable no-async-promise-executor */
        return new Promise(async (resolve) => {

            // Create a callback to wait for completion
            /* eslint-disable @typescript-eslint/no-unused-vars */
            this._eventEmitter.once('LOGOUT_COMPLETE', (args: URLSearchParams) => {
                resolve();
            });

            // First build the logout URL
            const logoutUrl = this._buildLogoutUrl();
            await open(logoutUrl);
        });
    }

    /*
     * Cognito requires a custom URL, otherwise we use the standards based value
     */
    private _buildLogoutUrl(): string {

        if (this._configuration.authority.toLowerCase().indexOf('cognito') !== -1) {

            const logoutReturnUri = encodeURIComponent(this._configuration.postLogoutRedirectUri);
            const clientId = encodeURIComponent(this._configuration.clientId);
            return `${this._configuration.customLogoutEndpoint}?client_id=${clientId}&logout_uri=${logoutReturnUri}`;

        } else {

            const endSessionUrl = this._metadata.endSessionEndpoint;
            const postLogoutRedirectUri = encodeURIComponent(this._configuration.postLogoutRedirectUri);
            const idTokenParam = encodeURIComponent(this._idToken);
            return `${endSessionUrl}?post_logout_redirect_uri=${postLogoutRedirectUri}&id_token_hint=${idTokenParam}`;
        }
    }
}
