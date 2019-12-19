import {UIError} from '../plumbing/errors/uiError';

/*
 * Application level state used for rendering
 */
export interface AppState {

    // The initial load creates the main page's objects
    isLoading: boolean;

    // Populated when there is an application level error
    applicationError: UIError | null;

    // Some controls are hidden during loading and shown afterwards
    isLoaded: boolean;

    // Record when the size changes to that of a mobile phone
    isMobileSize: boolean;
}
