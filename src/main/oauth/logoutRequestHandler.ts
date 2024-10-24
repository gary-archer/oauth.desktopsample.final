import {AuthorizationServiceConfiguration} from '@openid/appauth';
import EventEmitter from 'node:events';
import open from 'open';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';

/*
 * A class to handle the plumbing of logout redirects via the system browser
 */
export class LogoutRequestHandler {

    private readonly configuration: OAuthConfiguration;
    private readonly metadata: AuthorizationServiceConfiguration;
    private readonly idToken: string;
    private readonly eventEmitter: EventEmitter;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        idToken: string,
        eventEmitter: EventEmitter) {

        this.configuration = configuration;
        this.metadata = metadata;
        this.idToken = idToken;
        this.eventEmitter = eventEmitter;
    }

    /*
     * Invoke the system browser to log the user out
     */
    public async execute(): Promise<void> {

        /* eslint-disable no-async-promise-executor */
        return new Promise(async (resolve) => {

            // Create a callback to wait for completion
            /* eslint-disable @typescript-eslint/no-unused-vars */
            this.eventEmitter.once('LOGOUT_COMPLETE', (args: URLSearchParams) => {
                resolve();
            });

            // First build the logout URL
            const logoutUrl = this.buildLogoutUrl();
            await open(logoutUrl);
        });
    }

    /*
     * Cognito requires a custom URL, otherwise we use the standards based value
     */
    private buildLogoutUrl(): string {

        if (this.configuration.authority.toLowerCase().indexOf('cognito') !== -1) {

            const logoutReturnUri = encodeURIComponent(this.configuration.postLogoutRedirectUri);
            const clientId = encodeURIComponent(this.configuration.clientId);
            return `${this.configuration.customLogoutEndpoint}?client_id=${clientId}&logout_uri=${logoutReturnUri}`;

        } else {

            const endSessionUrl = this.metadata.endSessionEndpoint;
            const postLogoutRedirectUri = encodeURIComponent(this.configuration.postLogoutRedirectUri);
            const idTokenParam = encodeURIComponent(this.idToken);
            return `${endSessionUrl}?post_logout_redirect_uri=${postLogoutRedirectUri}&id_token_hint=${idTokenParam}`;
        }
    }
}
