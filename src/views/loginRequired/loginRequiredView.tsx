import React, {useEffect, useState} from 'react';
import {EventNames} from '../../plumbing/events/eventNames';
import {LoginStartedEvent} from '../../plumbing/events/loginStartedEvent';
import {NavigateEvent} from '../../plumbing/events/navigateEvent';
import {LoginRequiredViewProps} from './loginRequiredViewProps';
import {LoginRequiredViewState} from './loginRequiredViewState';

/*
 * Render the login required view
 */
export function LoginRequiredView(props: LoginRequiredViewProps): JSX.Element {

    const [state, setState] = useState<LoginRequiredViewState>({
        isSigningIn: false,
    });

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {

        // Inform other parts of the app that the main view is no longer active
        props.eventBus.emit(EventNames.Navigate, null, new NavigateEvent(false));

        // Subscribe to the login started event, triggered when a header button is clicked
        props.eventBus.on(EventNames.LoginStarted, onLoginStarted);
    }

    function cleanup() {
        props.eventBus.detach(EventNames.LoginStarted, onLoginStarted);
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    function onLoginStarted(_event: LoginStartedEvent) {
        setState((s) => {
            return {
                ...s,
                isSigningIn: true,
            };
        });
    }

    /*
     * When sign in is clicked we show some green text while the user waits
     */
    function renderSigningIn(): JSX.Element {

        return (
            <>
                <p className='signingincolor'>
                    Please sign in via your browser, then click continue to return here ...
                </p>
            </>
        );
    }

    return  (
        <div className='row'>
            <div className='col-12 text-center mx-auto'>
                <h6>
                    You are logged out - click HOME to sign in ...
                </h6>
                {state.isSigningIn && renderSigningIn()}
            </div>
        </div>
    );
}
