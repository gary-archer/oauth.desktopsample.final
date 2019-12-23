import {UIError} from '../../plumbing/errors/uiError';

/*
 * Input to the login required view
 */
export interface LoginRequiredViewState {

    // True while the UI is waiting for login to complete in the system browser
    signingIn: boolean;

    // Contains an error when applicable
    signInError: UIError | null;
}
