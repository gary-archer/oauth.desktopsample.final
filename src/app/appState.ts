import {UIError} from '../plumbing/errors/uiError';

/*
 * Application level state used for rendering
 */
export interface AppState {
    isInitialised: boolean;
    error: UIError | null;
}
