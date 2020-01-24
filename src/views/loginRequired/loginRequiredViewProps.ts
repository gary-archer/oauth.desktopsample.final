import {Authenticator} from '../../plumbing/oauth/authenticator';

/*
 * Input to the login required view
 */
export interface LoginRequiredViewProps {

    // The authenticator object triggers the login
    authenticator: Authenticator;

    // Called when login completes successfully
    onLoginCompleted: () => void;
}
