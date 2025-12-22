/*
 * Events used for inter process calls between the main and renderer processes
 */
export class IpcEventNames {

    // The UI calls the main process to perform API requests
    public static readonly ON_GET_COMPANIES = 'api_companies';
    public static readonly ON_GET_TRANSACTIONS = 'api_transactions';
    public static readonly ON_GET_OAUTH_USER_INFO = 'api_oauthuserinfo';
    public static readonly ON_GET_API_USER_INFO = 'api_userinfo';

    // The UI calls the main process to perform these OAuth operations
    public static readonly ON_GET_SESSION = 'oauth_getSession';
    public static readonly ON_LOGIN = 'oauth_login';
    public static readonly ON_LOGOUT = 'oauth_logout';
    public static readonly ON_TOKEN_REFRESH = 'oauth_tokenrefresh';
    public static readonly ON_CLEAR_LOGIN_STATE = 'oauth_clearstate';
    public static readonly ON_EXPIRE_ACCESS_TOKEN = 'oauth_expireaccesstoken';
    public static readonly ON_EXPIRE_REFRESH_TOKEN = 'oauth_expirerefreshtoken';

    // The UI calls the main process at startup to see if there is a deep link startup URL
    // The main process calls the renderer process to deliver deep links
    public static readonly ON_DEEP_LINK_STARTUP_PATH = 'get_startup_url';
    public static readonly ON_DEEP_LINK = 'private_scheme_url';
}
