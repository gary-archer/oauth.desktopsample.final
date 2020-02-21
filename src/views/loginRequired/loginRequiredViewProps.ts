/*
 * Input to the login required view
 */
export interface LoginRequiredViewProps {

    // A callback to trigger the login redirect from the app view
    onLoginRedirect: () => Promise<void>;
}
