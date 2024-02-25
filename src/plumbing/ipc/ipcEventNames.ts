/*
 * Events used for inter process calls between the main and renderer processes
 */
export class IpcEventNames {

    // The UI calls the main process to perform these OAuth operations
    public static readonly ON_LOGIN = 'login';
    public static readonly ON_LOGOUT = 'logout';

    // The UI calls the main process to load configuration
    public static readonly ON_GET_CONFIGURATION = 'get_configuration';

    // The UI calls the main process at startup to see if there is a deep link startup URL
    public static readonly ON_GET_DEEP_LINK_STARTUP_URL = 'get_startup_url';

    // The main process calls the renderer process to deliver private uri scheme notifications
    public static readonly ON_PRIVATE_URI_SCHEME_NOTIFICATION = 'private_scheme_url';
}
