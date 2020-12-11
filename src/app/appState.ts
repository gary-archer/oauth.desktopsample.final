/*
 * Application level state used for rendering
 */
export interface AppState {

    // Whether the app has started up, read configuration and created global objects
    isInitialised: boolean;

    // After login this is used to keep track of whether all views have loaded their API data
    isDataLoaded: boolean;

    // The application level error if applicable
    error: any;
}
