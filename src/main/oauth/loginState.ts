import {AuthorizationRequest} from '@openid/appauth';

/*
 * Store data to enable cleanup of all login resources once a login succeeds
 */
export class LoginState {

    private requests: AuthorizationRequest[];

    public constructor() {
        this.requests = [];
        this.setupCallbacks();
    }

    /*
     * Store the request so that we can validate the response state
     */
    public storeRequest(request: AuthorizationRequest): void {
        this.requests.push(request);
    }

    /*
     * Look up a callback from the state parameter
     */
    public getRequestForState(state: string): AuthorizationRequest | null {

        const found = this.requests.find((r) => r.state === state);
        if (found) {
            return found;
        }

        return null;
    }

    /*
     * Clear all data once a login completes
     */
    public clear(): void {
        this.requests = [];
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.getRequestForState = this.getRequestForState.bind(this);
    }
}
