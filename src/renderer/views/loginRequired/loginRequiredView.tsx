import {JSX, useEffect, useState} from 'react';
import {UIEventNames} from '../events/uiEventNames';
import {LoginStartedEvent} from '../events/loginStartedEvent';
import {NavigatedEvent} from '../events/navigatedEvent';
import {LoginRequiredViewProps} from './loginRequiredViewProps';

/*
 * Render the login required view
 */
export function LoginRequiredView(props: LoginRequiredViewProps): JSX.Element {

    // Initialize React state
    const [isSigningIn, setIsSigningIn] = useState(false);

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {

        // Inform other parts of the app that the main view is no longer active
        props.eventBus.emit(UIEventNames.Navigated, null, new NavigatedEvent(false));

        // Subscribe to the login started event, triggered when a header button is clicked
        props.eventBus.on(UIEventNames.LoginStarted, onLoginStarted);
    }

    function cleanup() {
        props.eventBus.detach(UIEventNames.LoginStarted, onLoginStarted);
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
                    You are signed out - sign in to access the app ...
                </h6>
                {isSigningIn && renderSigningIn()}
            </div>
        </div>
    );
}
