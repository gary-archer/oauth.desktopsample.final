import {AppEvents} from '../events/appEvents';

/*
 * A class to manage state when interacting with the system browser, including re-entrancy
 */
export class OAuthState {

    // A map of the request state parameter to the OAuth event object on which the response is received
    private static _stateEventsMap = [] as Array<[string, AppEvents]>;

    /*
     * A dummy state parameter associated to logout redirects
     */
    public static get logout(): string {
        return 'logout';
    }

    /*
     * During an authorization redirect, store an entry based on the state parameter
     */
    public addState(state: string, events: AppEvents): void {

        if (!this.getEvents(state)) {
            OAuthState._stateEventsMap.push([state, events]);
        }
    }

    /*
     * Remove an entry when the response is received
     */
    public removeState(state: string): void {

        if (this.getEvents(state)) {
            OAuthState._stateEventsMap = OAuthState._stateEventsMap.filter((se) => se[0] !== state);
        }
    }

    /*
     * Get events for the state parameter in an authorization response message
     */
    public getEvents(state: string): AppEvents | null {

        const stateEventsPair = OAuthState._stateEventsMap.find((se) => se[0] === state);
        if (stateEventsPair) {
            return stateEventsPair[1];
        }

        return null;
    }
}
