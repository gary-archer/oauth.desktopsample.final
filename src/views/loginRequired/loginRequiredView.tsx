import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {EventNames} from '../../plumbing/events/eventNames';
import {LoginStartedEvent} from '../../plumbing/events/loginStartedEvent';
import {NavigatedEvent} from '../../plumbing/events/navigatedEvent';
import {CurrentLocation} from '../utilities/currentLocation';
import {LoginRequiredViewProps} from './loginRequiredViewProps';

/*
 * Render the login required view
 */
export function LoginRequiredView(props: LoginRequiredViewProps): JSX.Element {

    const [isSigningIn, setIsSigningIn] = useState(false);

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    CurrentLocation.path = useLocation().pathname;

    function startup() {

        // Inform other parts of the app that the main view is no longer active
        props.eventBus.emit(EventNames.Navigated, null, new NavigatedEvent(false));

        // Subscribe to the login started event, triggered when a header button is clicked
        props.eventBus.on(EventNames.LoginStarted, onLoginStarted);
    }

    function cleanup() {
        props.eventBus.detach(EventNames.LoginStarted, onLoginStarted);
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    function onLoginStarted(_event: LoginStartedEvent) {
        setIsSigningIn(true);
    }

    /*
     * When a login starts we show some green text while the user waits
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
                {isSigningIn && renderSigningIn()}
            </div>
        </div>
    );
}
