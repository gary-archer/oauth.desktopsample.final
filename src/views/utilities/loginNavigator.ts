import {NavigateFunction} from 'react-router-dom';
import {CurrentLocation} from './currentLocation';

/*
 * A utility class to manage navigating to login required and returning to the previous location after login
 */
export class LoginNavigator {

    private readonly _navigate: NavigateFunction;
    private readonly _key: string;

    public constructor(navigate: NavigateFunction) {
        this._navigate = navigate;
        this._key = 'desktopapp.location';
    }

    /*
     * Record the current location unless we are already in login required
     */
    public navigateToLoginRequired(): void {

        if (CurrentLocation.path != 'LoginRequired') {
            sessionStorage.setItem(this._key, CurrentLocation.path);
        }

        this._navigate('/loggedout');
    }

    /*
     * Restore the location before we moved to login required above
     */
    public restorePreLoginLocation(): void {

        const location = sessionStorage.getItem(this._key);
        if (location) {
            sessionStorage.removeItem(this._key);
        }

        this._navigate(location || '/');
    }
}
