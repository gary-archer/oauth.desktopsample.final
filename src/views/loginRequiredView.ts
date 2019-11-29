import * as $ from 'jquery';
import * as QueryString from 'query-string';
import {UIError} from '../plumbing/errors/uiError';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {ErrorFragment} from './errorFragment';

/*
 * The login required view takes up the entire screen except for the header
 */
export class LoginRequiredView {

    private readonly _authenticator: Authenticator;

    public constructor(authenticator: Authenticator) {
        this._authenticator = authenticator;
        this._setupCallbacks();
    }

    /*
     * Adjust UI elements when the view loads
     */
    public async execute(): Promise<void> {

        // Hide session related button controls
        $('.hideWhenLoggedOut').addClass('hide');

        // Show sign in controls
        $('.login').removeClass('hide');
        $('#btnLogin').click(this._onLoginStart);

        // Login progress is hidden until Sign In has been clicked
        $('.signingin').addClass('hide');
    }

    /*
     * Disable the Sign In controls on unload
     */
    public unload(): void {

        // Make session related controls visible
        $('.hideWhenLoggedOut').removeClass('hide');

        // Hide sign in controls
        $('.login').addClass('hide');
        $('#btnLogin').unbind('click');
    }

    /*
     * From the login page, start a login request and indicate progress
     */
    private async _onLoginStart(e: any): Promise<void> {

        try {
            // Show sign in progress
            $('.signingin').removeClass('hide');
            e.preventDefault();

            // Start the login
            await this._authenticator!.startLogin(this._onLoginCompleted);

        } catch (e) {

            // Report failures
            const errorView = new ErrorFragment();
            errorView.execute(e);
        }
    }

    /*
     * Update the UI after a login attempt completes
     */
    private _onLoginCompleted(e: UIError | null): void {

        if (!e) {

            // Return the user to the pre login location
            const hashData = QueryString.parse(location.hash);
            if ('return' in hashData) {
                const hash = decodeURIComponent(hashData.return);
                location.hash = hash;
            } else {
                location.hash = '#';
            }

        } else {

            // If there has been an error then first hide sign in progress
            $('.signingin').addClass('hide');

            // Then render the error details
            const errorView = new ErrorFragment();
            errorView.execute(e);
        }
    }

    /*
     * Plumbing to ensure that the this parameter is available in async event handlers
     */
    private _setupCallbacks(): void {
        this._onLoginStart = this._onLoginStart.bind(this);
        this._onLoginCompleted = this._onLoginCompleted.bind(this);
    }
}
