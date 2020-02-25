/*
 * Constants for named events
 */
export class GlobalEventNames {

    // Events between the Electron main and renderer processes
    public static ON_GET_CUSTOM_SCHEME_STARTUP_URL = 'get_startup_url';
    public static ON_CUSTOM_SCHEME_URL_NOTIFICATION = 'custom_scheme_url_notification';

    // Events fired during OAuth processing
    public static ON_AUTHORIZATION_RESPONSE = 'authorization_response';
    public static ON_AUTHORIZATION_RESPONSE_COMPLETED = 'authorization_response_completed';
    public static ON_END_SESSION_RESPONSE = 'end_session_response';

    // Events fired between React JS screens
    public static readonly ON_ERROR = 'error';
    public static readonly ON_RELOAD = 'reload';
}
