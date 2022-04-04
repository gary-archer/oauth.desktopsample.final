import {HashHistory} from 'history';

/*
 * A utility class to manage navigating to login required and returning to the previous location after login
 */
export class LoginNavigator {

    private readonly _history: HashHistory;
    private readonly _key: string;

    public constructor(history: HashHistory) {
        this._history = history;
        this._key = 'desktopapp.returnurl';
    }

    /*
     * Start the login workflow by updating the hash fragment, which will invoke the login required view
     */
    public navigateToLoginRequired(): void {
        
        // Record the previous main location unless we are already in login required
        if (this._history.location.pathname != '/loggedout') {
            sessionStorage.setItem(this._key, this._history.location.pathname);
        }
        
        this._history.push('/loggedout');
        this._history.go(0);
    }

    /*
     * Restore the location before we moved to login required above
     */
    public restorePreLoginLocation(): void {

        const returnUrl = sessionStorage.getItem(this._key);
        if (returnUrl) {
            sessionStorage.removeItem(this._key);
            this._history.push(returnUrl);
        }
    }
}
