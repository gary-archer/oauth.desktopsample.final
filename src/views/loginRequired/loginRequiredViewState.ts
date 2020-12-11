import {UIError} from '../../plumbing/errors/uiError';

/*
 * Input to the login required view
 */
export interface LoginRequiredViewState {

    // Used to show green visual progress while a login is occurring in the system browser
    signingIn: boolean;

    // Errors that occur during the above operations
    error: UIError | null;
}
