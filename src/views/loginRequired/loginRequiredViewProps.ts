import {Authenticator} from '../../plumbing/oauth/authenticator';

/*
 * Input to the login required view
 */
export interface LoginRequiredViewProps {

    // The authenticator object is used to trigger a login redirect
    authenticator: Authenticator;

    // Inform the main view when a login completes
    onLoginCompleted: () => void;
}
