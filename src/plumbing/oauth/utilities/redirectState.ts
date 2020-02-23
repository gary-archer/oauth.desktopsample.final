import {RedirectEvents} from './redirectEvents';

/*
 * A custom type to map the request state for a redirect attempt to its events
 */
type StateEventsPair = [string, RedirectEvents];

/*
 * Manage re-entrancy if there are multiple redirect attempts
 */
export class RedirectState {

    /*
     * A map of redirect attempts to request state
     */
    private static _stateEventsMap = [] as StateEventsPair[];

    /*
     * Add an entry to our collection
     */
    public addState(state: string, redirectEvents: RedirectEvents): void {

        if (!this.getEvents(state)) {
            RedirectState._stateEventsMap.push([state, redirectEvents]);
        }
    }

    /*
     * Remove an entry from our collection
     */
    public removeState(state: string): void {

        RedirectState._stateEventsMap = RedirectState._stateEventsMap.filter((se) => se[0] !== state);
    }

    /*
     * Get events for a received redirect response
     */
    public getEvents(state: string): RedirectEvents | null {

        const stateEventsPair = RedirectState._stateEventsMap.find((se) => se[0] === state);
        if (stateEventsPair) {
            return stateEventsPair[1];
        }

        return null;
    }
}
