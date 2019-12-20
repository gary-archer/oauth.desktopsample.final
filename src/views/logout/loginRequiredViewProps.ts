/*
 * Input to the login required view
 */
export interface LoginRequiredViewProps {

    // A callback when the view is loading
    onViewLoading: (viewType: string) => void;

    // A callback when the view loads successfully
    onViewLoaded: () => void;
}
