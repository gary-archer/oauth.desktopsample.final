import {UIError} from './uiError';

/*
 * A class to handle error processing
 */
export class ErrorHandler {

    /*
     * An error if we receive an invalid response state
     */
    public static getFromInvalidLoginResponseState(): UIError {

        return new UIError(
            'Login',
            'invalid_state',
            'The login response state did not match the login request state');
    }
}
