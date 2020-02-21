import {UIError} from '../errors/uiError';

/*
 * An interface to represent authentication related operations
 */
export interface Authenticator {

    isLoggedIn(): Promise<boolean>;

    getAccessToken(): Promise<string>;

    startLogin(onCompleted: (error: UIError | null) => void): Promise<void>;

    startLogout(onCompleted: () => void): Promise<void>;

    clearAccessToken(): Promise<void>;

    expireAccessToken(): Promise<void>;

    expireRefreshToken(): Promise<void>;
}
