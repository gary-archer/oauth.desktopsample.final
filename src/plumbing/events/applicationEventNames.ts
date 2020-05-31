/*
 * Constants for named events
 */
export class ApplicationEventNames {

    // The main process is called to get the app's location
    public static readonly ON_GET_APP_LOCATION = 'get_app_location';

    // The main process is called at startup to see if there is a deep link startup URL
    public static readonly ON_GET_DEEP_LINK_STARTUP_URL = 'get_startup_url';

    // The main process calls the renderer process to deliver private uri scheme notifications
    public static readonly ON_PRIVATE_URI_SCHEME_NOTIFICATION = 'custom_scheme_url_notification';

    // Used to send requests to login to the login required page
    public static readonly ON_LOGIN = 'login';

    // Used to send requests to reload data to view pages
    public static readonly ON_RELOAD = 'reload';
}
