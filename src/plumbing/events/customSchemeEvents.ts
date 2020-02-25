/*
 * Event messages sent between Electron's main and renderer processes
 */
export class CustomSchemeEvents {

    // The main process is called at startup to see if there is a deep link startup URL
    public static readonly ON_GET_CUSTOM_SCHEME_STARTUP_URL = 'get_startup_url';

    // The main process calls the renderer process to deliver custom scheme notifications
    public static readonly ON_CUSTOM_SCHEME_URL_NOTIFICATION = 'custom_scheme_url_notification';
}
