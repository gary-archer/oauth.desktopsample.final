import React from 'react';
import {UIError} from '../../plumbing/errors/uiError';
import {ApplicationEventNames} from '../../plumbing/events/applicationEventNames';
import {ApplicationEvents} from '../../plumbing/events/applicationEvents';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {LoginRequiredViewProps} from './loginRequiredViewProps';
import {LoginRequiredViewState} from './loginRequiredViewState';

/*
 * Render the simple login required view
 */
export class LoginRequiredView extends React.Component<LoginRequiredViewProps, LoginRequiredViewState> {

    /*
     * Initialise state when constructed
     */
    public constructor(props: any) {
        super(props);
        this._setupCallbacks();

        this.state = {
            signingIn: false,
            error: null,
        };
    }

    /*
     * Render the simple logout view
     */
    public render(): React.ReactNode {

        return  (
            <div className='row'>
                <div className='col-12 text-center mx-auto loginrequired'>
                    <h5>
                        You are logged out - click <a href='#' onClick={this._onLoginClick}>here</a> to sign in ...
                    </h5>
                    {this.state.signingIn && !this.state.error && this._renderSigningIn()}
                    {this.state.error && this._renderError()}
                </div>
            </div>
        );
    }

    /*
     * Load data then listen for the login event
     */
    public async componentDidMount(): Promise<void> {
        ApplicationEvents.subscribe(ApplicationEventNames.ON_LOGIN, this._onLogin);
    }

    /*
     * Unsubscribe when we unload
     */
    public async componentWillUnmount(): Promise<void> {
        ApplicationEvents.unsubscribe(ApplicationEventNames.ON_RELOAD, this._onLogin);
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
     * Render any sign in error details
     */
    private _renderError(): React.ReactNode {

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered Logging In',
            dialogTitle: 'Login Error',
            error: this.state.error,
        };
        return (
            <div className='row'>
                <div className='col-12 text-center mx-auto'>
                    <ErrorSummaryView {...errorProps}/>
                </div>
            </div>
        );
    }

    /*
     * Trigger the login redirect when login is clicked
     */
    private async _onLoginClick(event: React.MouseEvent<HTMLAnchorElement>): Promise<void> {

        event.preventDefault();
        await this._onLogin();
    }

    /*
     * Trigger the login redirect when login is clicked
     */
    private async _onLogin(): Promise<void> {

        try {
            // Reset error state during a login attempt
            this.setState({error: null});

            // Update UI state to show that a sign in is in progress
            this.setState({signingIn: true});

            // Do the login redirect
            await this.props.authenticator.startLogin(this._onLoginComplete);

        } catch (e) {

            // Render errors
            this.setState({error: e});
        }
    }

    /*
     * Receive login responses
     */
    private async _onLoginComplete(error: UIError | null): Promise<void> {

        // Report errors if required
        this.setState({error});

        // Inform the parent view when a login completes successfully
        if (!error) {
            this.props.onLoginCompleted();
        }
    }

    /*
     * Ensure that the this parameter is available in callbacks
     */
    private _setupCallbacks() {
        this._onLoginClick = this._onLoginClick.bind(this);
        this._onLogin = this._onLogin.bind(this);
        this._onLoginComplete = this._onLoginComplete.bind(this);
    }
}
