import {UIError} from '../plumbing/errors/uiError';

/*
 * Application level state used for rendering
 */
export interface AppState {

    // True while startup configuration is being processed
    isStarting: boolean;

    // Some controls are hidden during view loading and shown afterwards
    isMainViewLoaded: boolean;

    // Whether currently logged out
    isLoggedOut: boolean;

    // Populated when there is an application startup error
    applicationError: UIError | null;
}
