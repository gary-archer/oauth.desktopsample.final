import {RedirectEvents} from './redirectEvents';

/*
 * Manage re-entrancy if there are multiple redirect attempts
 */
export class RedirectState {

    // A map of redirect attempts to request state
    private static _stateEventsMap = [] as Array<[string, RedirectEvents]>;

    /*
     * During an authorization redirect, store an entry based on the state parameter
     */
    public addState(state: string, redirectEvents: RedirectEvents): void {

        if (!this.getEvents(state)) {
            RedirectState._stateEventsMap.push([state, redirectEvents]);
        }
    }

    /*
     * Remove an entry when the response is received
     */
    public removeState(state: string): void {

        RedirectState._stateEventsMap = RedirectState._stateEventsMap.filter((se) => se[0] !== state);
    }

    /*
     * Get events for the state parameter in an authorization response message
     */
    public getEvents(state: string): RedirectEvents | null {

        const stateEventsPair = RedirectState._stateEventsMap.find((se) => se[0] === state);
        if (stateEventsPair) {
            return stateEventsPair[1];
        }

        return null;
    }
}
