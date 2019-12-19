import {UIError} from './uiError';

/*
 * A class to handle error processing
 */
export class ErrorHandler {

    /*
     * Return an error based on the exception type or properties
     */
    public static getFromException(exception: any): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'UI',
            'general_exception',
            'A technical problem was encountered in the UI',
            exception.stack);

        // Set technical details from the received exception
        error.details = ErrorHandler._getExceptionMessage(exception);
        return error;
    }

    /*
     * A login required error is thrown to short circuit execution when the UI cannot get an access token
     */
    public static getFromLoginRequired(): UIError {

        return new UIError(
            'login',
            'login_required',
            'No access token is available and a login is required');
    }

    /*
     * Sign in request errors most commonly mean a CORS error or that the API is unavailable
     */
    public static getFromOAuthRequest(exception: any, errorCode: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Login',
            errorCode,
            `A technical problem occurred during login processing`,
            exception.stack);

        // Set technical details from the received exception
        error.details = ErrorHandler._getOAuthExceptionMessage(exception);
        return error;
    }

    /*
     * Sign in response errors most commonly have OAuth error details
     */
    public static getFromOAuthResponse(exception: any, errorCode: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        // Create the error
        const error = new UIError(
            'Login',
            errorCode,
            `A technical problem occurred during login processing`,
            exception.stack);

        // Set technical details from the received exception
        error.details = ErrorHandler._getOAuthExceptionMessage(exception);
        return error;
    }

    /*
     * An error if we receive an invalid response state
     */
    public static getFromInvalidLoginResponseState(): UIError {

        return new UIError(
            'Login',
            'invalid_state',
            'The login response state did not match the login request state');
    }

    /*
     * Return an object for Ajax errors
     */
    public static getFromApiError(exception: any, url: string): UIError {

        // Already handled errors
        if (exception instanceof UIError) {
            return exception;
        }

        let error = null;
        if (exception.status === 0 ) {

            // This status is generally a CORS or availability problem
            error = new UIError(
                'Network',
                'api_uncontactable',
                'A network problem occurred when the UI called the server',
                exception.stack);
            error.details = 'API not available or request was not allowed';

        } else if (exception.status >= 200 && exception.status <= 299) {

            // This status is generally a JSON parsing error
            error = new UIError(
                'Data',
                'api_data_error',
                'A technical problem occurred when the UI received data',
                exception.stack);
            error.details = 'Unable to parse data from API response';

        } else {

            // Create a default API error
            error = new UIError(
                'API',
                'general_api_error',
                'A technical problem occurred when the UI called the server',
                exception.stack);
            error.details = 'API returned an error response';

            // Override the default with a server response when received and CORS allows us to read it
            ErrorHandler._updateFromApiErrorResponse(error, exception);
        }

        // Set the HTTP status if received
        if (exception.status) {
            error.statusCode = exception.status;
        }

        error.url = url;
        return error;
    }

    /*
     * Try to update the default API error with response details
     */
    private static _updateFromApiErrorResponse(error: UIError, exception: any): void {

        // Attempt to read the API error response
        const apiError = ErrorHandler._readApiJsonResponse(exception);
        if (apiError) {

            // Set the code and message, returned for both 4xx and 5xx errors
            if (apiError.code && apiError.message) {
                error.errorCode = apiError.code;
                error.details = apiError.message;
            }

            // Set extra details returned for 5xx errors
            if (apiError.area && apiError.id && apiError.utcTime) {
                error.setApiErrorDetails(apiError.area, apiError.id, apiError.utcTime);
            }
        }
    }

    /*
     * If the API response is JSON then attempt to parse it into an object
     */
    private static _readApiJsonResponse(exception: any): any {

        try {
            // We have to assume that the response is JSON
            // We cannot read headers content-length and content-type to verify this
            return JSON.parse(exception.responseText);

        } catch (e) {
            console.log(`Malformed JSON received in an API response: ${e}`);
        }
    }

    /*
     * Get the message from an OAuth exception
     */
    private static _getOAuthExceptionMessage(exception: any): string {

        let oauthError = '';
        if (exception.error) {
            oauthError = exception.error;
            if (exception.error_description) {
                oauthError += ` : ${exception.error_description}`;
            }
        }

        if (oauthError) {
            return oauthError;
        } else {
            return ErrorHandler._getExceptionMessage(exception);
        }
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static _getExceptionMessage(exception: any): string {

        if (exception.message) {
            return exception.message;
        } else {
            const details = exception.toString();
            if (details !== {}.toString()) {
                return details;
            } else {
                return '';
            }
        }
    }
}
