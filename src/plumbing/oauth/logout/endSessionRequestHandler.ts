import {AuthorizationServiceConfiguration} from '@openid/appauth';
import {RedirectEvents} from '../utilities/redirectEvents';
import {EndSessionNotifier} from './endSessionNotifier';
import {EndSessionRequest} from './endSessionRequest';
import {EndSessionRequestResponse} from './endSessionRequestResponse';
import {CognitoLogoutUrlBuilder} from './cognitoLogoutUrlBuilder';

/*
 * A class to perform logout, which follows the same pattern as AppAuth-JS logins
 */
export class EndSessionRequestHandler {

    private readonly _logoutEvents: RedirectEvents;

    public constructor(logoutEvents: RedirectEvents) {
        this._logoutEvents = logoutEvents;
    }

    public performEndSessionRequest(
        configuration: AuthorizationServiceConfiguration,
        request: EndSessionRequest): void {
    }

    /*
     * Format the logout URL
     */
    private _buildRequestUrl(configuration: AuthorizationServiceConfiguration, request: EndSessionRequest): string {
        return '';
    }

    public async completeEndSessionRequestIfPossible(): Promise<void> {
        // TODO
    }

    public setEndSessionNotifier(notifier: EndSessionNotifier): EndSessionRequestHandler {
        return this;
    }

    /*public completeEndSessionRequest(): Promise<EndSessionRequestResponse | null> {
        return new Promise<null>();
    }*/
}
