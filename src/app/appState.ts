/*
 * Application level state used for rendering
 */
export interface AppState {

    // Whether the view has processed configuration and created global objects
    isInitialised: boolean;
    
    // A flag used to force a rerender after routing
    rerender: boolean;
}
