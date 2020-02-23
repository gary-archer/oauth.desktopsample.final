import React from 'react';
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
        };
    }

    /*
     * Render the simple logout view
     */
    public render(): React.ReactNode {

        return  (
            <div className='card border-0 loginrequired'>
                <h5>
                    You are logged out - click <a href='#' onClick={this._onLoginClick}>here</a> to log in ...
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
    private async _onLoginClick(event: React.MouseEvent<HTMLAnchorElement>): Promise<void> {

        // Update UI state to show that a sign in is in progress
        event.preventDefault();
        this.setState({signingIn: true});

        // Do the login redirect
        await this.props.onLoginRedirect();
    }

    /*
     * Ensure that the this parameter is available in callbacks
     */
    private _setupCallbacks() {
        this._onLoginClick = this._onLoginClick.bind(this);
    }
}
