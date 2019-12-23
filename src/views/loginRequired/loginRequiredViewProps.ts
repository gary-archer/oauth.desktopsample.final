import {Authenticator} from '../../plumbing/oauth/authenticator';

/*
 * Input to the login required view
 */
export interface LoginRequiredViewProps {

    // The authenticator object triggers the login
    authenticator: Authenticator;

    // A callback when the view is loading
    onViewLoading: (viewType: string) => void;

    // A callback when the view loads successfully
    onViewLoaded: () => void;
}
