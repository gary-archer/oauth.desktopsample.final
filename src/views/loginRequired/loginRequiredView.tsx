import React from 'react';
import urlparse from 'url-parse';
import {UIError} from '../../plumbing/errors/uiError';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {LoginRequiredViewProps} from './loginRequiredViewProps';
import {LoginRequiredViewState} from './loginRequiredViewState';

/*
 * Render the simple login required view
 */
export class LoginRequiredView extends React.Component<LoginRequiredViewProps, LoginRequiredViewState> {

    /*
     * Start the login workflow by updating the hash fragment, which will invoke the view
     */
    public static navigate() {

        if (location.hash.length > 0) {

            // Record the previous main location unless we are already in login required
            location.hash = `#/loginrequired&return=${encodeURIComponent(location.hash)}`;

        } else {

            // Default to an empty return location
            location.hash = '#/loginrequired';
        }
    }

    /*
     * Initialise state when constructed
     */
    public constructor(props: any) {
        super(props);
        this._setupCallbacks();

        this.state = {
            signingIn: false,
            signInError: null,
        };
    }

    /*
     * Render the simple logout view
     */
    public render(): React.ReactNode {

        if (this.state.signInError) {

            // If there has been a sign in error then render it
            const errorProps = {
                hyperlinkMessage: 'Login Problem Encountered',
                dialogTitle: 'Login Error',
                error: this.state.signInError,
            };
            return (
                <div className='row'>
                    <div className='col-6 text-center mx-auto'>
                        <ErrorSummaryView {...errorProps}/>
                    </div>
                </div>
            );
        }

        // Otherwise render that the user needs to sign in
        return  (
            <div className='card border-0 loginrequired'>
                <h5>
                    You are logged out - click <a href='#' onClick={this._onLoginStart}>here</a> to log in ...
                </h5>
                {this.state.signingIn && this._renderSigningIn()}
            </div>
        );
    }

    /*
     * When sign in is clicked we show some green text while the user waits
     */
    private _renderSigningIn(): React.ReactNode {

        return (
            <>
                <p className='signingincolor'>
                    Sign In has started. If required, please switch to your browser and enter your credentials ...
                </p>
            </>
        );
    }

    /*
     * Trigger the login redirect when login is clicked
     */
    private async _onLoginStart(event: React.MouseEvent<HTMLAnchorElement>): Promise<void> {

        event.preventDefault();

        this.setState((prevState) => {
            return {...prevState, signingIn: true};
        });

        await this.props.authenticator!.startLogin(this._onLoginCompleted);
    }

    /*
     * Handle the return from login
     */
    private _onLoginCompleted(e: UIError | null): void {

        // Reset the signing in state
        this.setState((prevState) => {
            return {...prevState, signingIn: false};
        });

        // Store error state if required
        if (e) {
            this.setState((prevState) => {
                return {...prevState, signInError: e};
            });
            return;
        }

        // Inform the parent application
        this.props.onLoginCompleted();

        // Return to the current view
        this._returnToPreLoginLocation();
    }

    /*
     * On successful login, trigger navigation back to the app
     */
    private _returnToPreLoginLocation(): void {

        if (location.hash.startsWith('#')) {

            // See if the hash fragment has a return parameter
            const urlData = urlparse('?' + location.hash.substring(1), true);
            if (urlData && urlData.query && urlData.query.return) {

                // If so return to the pre login location
                const hash = decodeURIComponent(urlData.query.return);
                location.hash = hash;
                return;
            }
        }

        // Otherwise return to the root location
        location.hash = '#';
    }

    /*
     * Ensure that the this parameter is available in callbacks
     */
    private _setupCallbacks() {
        this._onLoginStart = this._onLoginStart.bind(this);
        this._onLoginCompleted = this._onLoginCompleted.bind(this);
    }
}
