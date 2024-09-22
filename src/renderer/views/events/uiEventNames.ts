/*
 * Constants for UI events that views use to notify each other with an event bus
 */
export class UIEventNames {
    public static Navigated      = 'Navigate';
    public static ViewModelFetch = 'ViewModelFetch';
    public static LoginRequired  = 'LoginRequired';
    public static LoginStarted   = 'LoginStarted';
    public static ReloadData     = 'ReloadData';
    public static DeepLink       = 'DeepLink';
}