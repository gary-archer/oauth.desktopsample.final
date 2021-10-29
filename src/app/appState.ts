/*
 * Application level state used for rendering
 */
export interface AppState {

    // Whether the app has started up, read configuration and created global objects
    isInitialised: boolean;

    // The application level error if applicable
    error: any;
}
