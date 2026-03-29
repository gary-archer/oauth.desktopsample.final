import {AuthorizationError} from '@openid/appauth';
import {Response} from 'undici';
import {ErrorCodes} from './errorCodes';
import {UIError} from './uiError';

/*
 * A class to handle error processing
 */
export class ErrorFactory {

    /*
     * Return an error based on the exception type or properties
     */
    public static fromException(exception: any): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Desktop UI',
            ErrorCodes.generalUIError,
            'A technical problem was encountered in the UI',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getExceptionMessage(exception));
        return error;
    }

    /*
     * Return this error if them main side ever receives untrusted IPC requests
     */
    public static fromIpcForbiddenError(): UIError {

        return new UIError(
            'Forbidden',
            ErrorCodes.ipcForbidden,
            'An IPC request was forbidden because the sender is not trusted');
    }

    /*
     * A login required error is thrown to short circuit execution when the UI cannot get an access token
     */
    public static fromLoginRequired(): UIError {

        return new UIError(
            'Login',
            ErrorCodes.loginRequired,
            'No access token is available and a login is required');
    }

    /*
     * A login cancelled error occurs if the login has already completed
     */
    public static fromLoginCancelled(): UIError {

        return new UIError(
            'Login',
            ErrorCodes.loginCancelled,
            'The login was cancelled');
    }

    /*
     * Handle authorization request errors
     */
    public static fromLoginRequestOperation(exception: any, errorCode: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Login',
            errorCode,
            'A technical problem occurred during login request processing',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getExceptionMessage(exception));
        return error;
    }

    /*
     * Handle authorization response errors
     */
    public static fromLoginResponseOperation(authorizationError: AuthorizationError): UIError {

        const error = new UIError(
            'Login',
            authorizationError.error,
            'The authorization server returned a login error response');

        error.setDetails(authorizationError.errorDescription || '');
        return error;
    }

    /*
     * Handle sign out request errors
     */
    public static fromLogoutOperation(exception: any, errorCode: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Logout',
            errorCode,
            'A technical problem occurred during logout processing',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getExceptionMessage(exception));
        return error;
    }

    /*
     * Handle errors from the token endpoint
     */
    public static fromTokenError(exception: any, errorCode: string): UIError {

        // Already handled
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Token',
            errorCode,
            'A technical problem occurred during token processing',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getExceptionMessage(exception));
        return error;
    }

    /*
     * Return an error due to rendering the view
     */
    public static fromRenderError(exception: any, componentStack: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Desktop UI',
            ErrorCodes.renderError,
            'A technical problem was encountered rendering the UI',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getExceptionMessage(exception));
        if (componentStack) {
            error.setDetails(`${error.getDetails()} : ${componentStack}`);
        }

        return error;
    }

    /*
     * Exceptions during fetches could be caused by misconfiguration, server unavailable or JSON parsing failures
     */
    public static getFromFetchError(exception: any, url: string, source: string): UIError {

        // Already handled
        if (exception instanceof UIError) {
            return exception;
        }

        let error: UIError;
        if (exception.constructor.name === 'SyntaxError') {

            // Handle JSON parse errors
            error = new UIError(
                'Data',
                ErrorCodes.dataError,
                `Unexpected data received from the ${source}`);

        } else {

            // Handle connection errors
            error = new UIError(
                'Connection',
                ErrorCodes.connectionError,
                `A connection error occurred when the UI called the ${source}`,
                exception.stack);
        }

        error.setDetails(this.getExceptionMessage(exception));
        error.setUrl(url);
        return error;
    }

    /*
     * Response errors can contain an API error response or may be issued by an API gateway
     */
    public static async getFromFetchResponseError(response: Response, source: string): Promise<UIError> {

        const error = new UIError(
            source,
            ErrorCodes.fetchError,
            `An error response was returned from the ${source}`
        );
        error.setStatusCode(response.status);
        return error;
    }

    /*
     * Response errors can contain the OAuth error and error_description fields
     */
    public static async getFromOAuthFetchResponseError(response: Response): Promise<UIError> {

        const error = await this.getFromFetchResponseError(response, 'authorization server');
        let details = 'Problem encountered during an OAuth request';

        try {

            const oauthError = await response.json() as any;
            if (oauthError) {

                if (oauthError.error) {
                    error.setErrorCode(oauthError.error);
                }
                if (oauthError.error_description) {
                    details = oauthError.error_description;
                }
            }
        } catch {
            // Swallow JSON parse errors for unexpected responses
        }

        error.setDetails(details);
        return error;
    }

    /*
     * Response errors can contain an API error response or may be issued by an API gateway
     */
    public static async getFromApiResponseError(response: Response): Promise<UIError> {

        const error = await this.getFromFetchResponseError(response, 'web API');
        let details = 'Problem encountered during an API request';

        try {
            // The API returns JSON responses for all errors so try to read JSON
            const apiError = await response.json() as any;
            if (apiError) {

                if (apiError.code && apiError.message) {
                    error.setErrorCode(apiError.code);
                    details = apiError.message;
                }

                // Set extra details returned for 5xx errors
                if (apiError.area && apiError.id && apiError.utcTime) {
                    error.setApiErrorDetails(apiError.area, apiError.id, apiError.utcTime);
                }
            }
        } catch {
            // Swallow JSON parse errors for unexpected responses
        }

        error.setDetails(details);
        return error;
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static getExceptionMessage(exception: any): string {

        if (exception.message) {
            return exception.message;
        }

        const details = exception.toString();
        if (details !== {}.toString()) {
            return details;
        }

        return '';
    }
}
