import {AuthorizationRequest} from '@openid/appauth';

/*
 * Store data to enable cleanup of all login resources once a login succeeds
 */
export class LoginState {

    private _requests: AuthorizationRequest[];

    public constructor() {
        this._requests = [];
        this._setupCallbacks();
    }

    /*
     * Store the request so that we can validate the response state
     */
    public storeRequest(request: AuthorizationRequest): void {
        this._requests.push(request);
    }

    /*
     * Look up a callback from the state parameter
     */
    public getRequestForState(state: string): AuthorizationRequest | null {

        const found = this._requests.find((r) => r.state === state);
        if (found) {
            return found;
        }

        return null;
    }

    /*
     * Clear all data once a login completes
     */
    public clear(): void {
        this._requests = [];
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.getRequestForState = this.getRequestForState.bind(this);
    }
}
