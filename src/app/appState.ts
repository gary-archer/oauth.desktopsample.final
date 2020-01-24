import {UIError} from '../plumbing/errors/uiError';

/*
 * Application level state used for rendering
 */
export interface AppState {

    // True while startup configuration is being processed
    isStarting: boolean;

    // Some controls are hidden during view loading and shown afterwards
    isMainViewLoaded: boolean;

    // Some UI behaviour is governed by the login state
    isLoggedOut: boolean;

    // Populated when there is an application startup error
    applicationError: UIError | null;
}
