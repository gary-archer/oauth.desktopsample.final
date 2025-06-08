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
     * Handle sign in errors
     */
    public static fromLoginOperation(exception: any, errorCode: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Login',
            errorCode,
            'A technical problem occurred during login processing',
            exception.stack);

        // Set technical details from the received exception
        error.setDetails(ErrorFactory.getOAuthExceptionMessage(exception));
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
        error.setDetails(ErrorFactory.getOAuthExceptionMessage(exception));
        return error;
    }

    /*
     * Handle errors to the token endpoint
     */
    public static fromTokenError(exception: any, errorCode: string): UIError {

        // Already handled errors
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
        error.setDetails(ErrorFactory.getOAuthExceptionMessage(exception));
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
     * Return an object for Ajax errors
     */
    public static fromHttpError(exception: any, url: string, source: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Calculate the status code
        let statusCode = 0;
        if (exception.response && exception.response.status) {
            statusCode = exception.response.status;
        }

        let error: UIError | null = null;
        if (statusCode === 0) {

            // This status is generally an availability problem
            error = new UIError(
                'Network',
                ErrorCodes.apiNetworkError,
                `A network problem occurred when the UI called the ${source}`,
                exception.stack);
            error.setDetails(this.getExceptionMessage(exception));

        } else if (statusCode >= 200 && statusCode <= 299) {

            // This status is generally a JSON parsing error
            error = new UIError(
                'Data',
                ErrorCodes.apiDataError,
                `A technical problem occurred parsing received data from the ${source}`,
                exception.stack);
            error.setDetails(this.getExceptionMessage(exception));

        } else {

            // Create a default API error, which may include an error response
            error = new UIError(
                'API',
                ErrorCodes.apiResponseError,
                `A technical problem occurred when the UI called the ${source}`,
                exception.stack);
            error.setDetails(this.getExceptionMessage(exception));

            // Read response error payloads
            if (exception.response && exception.response.data && typeof exception.response.data === 'object') {
                ErrorFactory.updateFromErrorResponseBody(error, exception.response.data);
            }
        }

        error.setStatusCode(statusCode);
        error.setUrl(url);
        return error;
    }

    /*
     * Try to update the default error with response details
     */
    private static updateFromErrorResponseBody(error: UIError, payload: any): void {

        // Attempt to read the API error response
        if (payload) {

            // Handle API errors, which include extra details for 5xx errors
            if (payload.code && payload.message) {

                error.setErrorCode(payload.code);
                error.message = payload.details;

                if (payload.area && payload.id && payload.utcTime) {
                    error.setApiErrorDetails(payload.area, payload.id, payload.utcTime);
                }
            }

            // Handle OAuth errors in HTTP reponses
            if (payload.error && payload.error_description) {

                error.setErrorCode(payload.error);
                error.message = payload.error_description;
            }
        }
    }

    /*
     * Get the message from an OAuth exception
     */
    private static getOAuthExceptionMessage(exception: any): string {

        let oauthError = '';
        if (exception.error) {
            oauthError = exception.error;
            if (exception.errorDescription) {
                oauthError += ` : ${exception.errorDescription}`;
            }
        }

        if (oauthError) {
            return oauthError;
        } else {
            return ErrorFactory.getExceptionMessage(exception);
        }
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static getExceptionMessage(exception: any): string {

        if (exception.message) {
            return exception.message;
        }

        if (exception.errorSummary) {
            return exception.errorSummary;
        }

        const details = exception.toString();
        if (details !== {}.toString()) {
            return details;
        }

        return '';
    }
}
