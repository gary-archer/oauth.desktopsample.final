/*
 * Error codes that the UI can program against
 */
export class ErrorCodes {

    // Used to indicate that the API cannot be called until the user logs in
    // Also returned by OAuth error responses when token renewal via prompt=none fails
    public static readonly loginRequired = 'login_required';

    // A technical error starting a login request, such as contacting the metadata endpoint
    public static readonly loginRequestFailed = 'login_request_failed';

    // A technical error processing the login response containing the authorization code
    public static readonly loginResponseFailed = 'login_response_failed';

    // Used to indicate that a login was cancelled
    public static readonly loginCancelled = 'login_cancelled';

    // A technical error processing the login response containing the authorization code
    public static readonly authorizationCodeGrantFailed = 'authorization_code_grant_failed';

    // A technical problem during background token renewal
    public static readonly tokenRenewalError = 'token_renewal_error';

    // The OAuth error when a refresh token expires
    public static readonly refreshTokenExpired = 'invalid_grant';

    // An error starting a logout request, such as contacting the metadata endpoint
    public static readonly logoutRequestFailed = 'logout_request_failed';

    // Returned from APIs when an access token is rejected
    public static readonly invalidToken = 'invalid_token';

    // Returned from APIs when it cannot find the claims it needs in access tokens
    public static readonly claimsFailure = 'claims_failure';

    // An error downloading user info from the authorization server
    public static readonly userInfoError = 'userinfo_error';

    // A general exception in the UI
    public static readonly generalUIError = 'general_ui_error';

    // Indicates an untrusted sender of IPC events
    public static readonly ipcForbidden = 'ipc_forbidden_error';

    // An error making an Ajax call to get API data
    public static readonly apiNetworkError = 'api_network_error';

    // An error receiving API data as JSON
    public static readonly apiDataError = 'api_data_error';

    // An error response fropm the API
    public static readonly apiResponseError = 'api_response_error';

    // An error rendering a React view
    public static readonly renderError = 'react_render_error';

    // Returned by the API when the user edits the browser URL and ties to access an unauthorised company
    public static readonly companyNotFound = 'company_not_found';

    // Returned by the API when the user edits the browser URL and supplies a non numeric company id
    public static readonly invalidCompanyId = 'invalid_company_id';
}
