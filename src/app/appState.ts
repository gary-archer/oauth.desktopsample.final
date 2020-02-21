import {UIError} from '../plumbing/errors/uiError';

/*
 * Application level state used for rendering
 */
export interface AppState {

    // True while startup configuration is being processed
    isStarting: boolean;

    // Whether currently logged in
    isLoggedIn: boolean;

    // After login, session buttons are disabled during view loading and shown afterwards
    sessionButtonsEnabled: boolean;

    // Populated when there is an application startup error
    applicationError: UIError | null;
}
