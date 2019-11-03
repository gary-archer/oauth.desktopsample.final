import {LoginEvents} from './loginEvents';

/*
 * A custom type to map the request state for a login attempt to its events
 */
type StateEventsPair = [string, LoginEvents];

/*
 * Manage re-entrancy if there are multiple login attempts
 */
export class LoginState {

    /*
     * A map of login attempts to request state
     */
    private static _stateEventsMap = [] as StateEventsPair[];

    /*
     * Add an entry to our collection
     */
    public addState(state: string, loginEvents: LoginEvents): void {

        LoginState._stateEventsMap.push([state, loginEvents]);
    }

    /*
     * Remove an entry from our collection
     */
    public removeState(state: string): void {

        LoginState._stateEventsMap = LoginState._stateEventsMap.filter((se) => se[0] !== state);
    }

    /*
     * Get events for a received login response
     */
    public getEvents(state: string): LoginEvents | null {

        const stateEventsPair = LoginState._stateEventsMap.find((se) => se[0] === state);
        if (stateEventsPair) {
            return stateEventsPair[1];
        }

        return null;
    }
}
