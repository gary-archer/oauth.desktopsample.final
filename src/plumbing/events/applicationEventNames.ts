/*
 * Constants for named events
 */
export class ApplicationEventNames {

    // The UI calls the main process to load configuration
    public static readonly ON_GET_CONFIGURATION = 'get_configuration';

    // The UI calls the main process to open the system browser
    public static readonly ON_OPEN_SYSTEM_BROWSER = 'open_system_browser';

    // The UI calls the main process at startup to see if there is a deep link startup URL
    public static readonly ON_GET_DEEP_LINK_STARTUP_URL = 'get_startup_url';

    // The main process calls the renderer process to deliver private uri scheme notifications
    public static readonly ON_PRIVATE_URI_SCHEME_NOTIFICATION = 'custom_scheme_url_notification';

    // The UI sends requests to the login required page
    public static readonly ON_LOGIN = 'login';

    // The UI sends this event to ask views to reload themselves
    public static readonly ON_RELOAD = 'reload';
}
