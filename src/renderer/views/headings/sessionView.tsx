import React, {useEffect, useState} from 'react';
import {NavigatedEvent} from '../events/navigatedEvent';
import {UIEventNames} from '../events/uiEventNames';
import {SessionViewProps} from './sessionViewProps';

/*
 * Render the session id used by API logs once data is loaded
 */
export function SessionView(props: SessionViewProps): JSX.Element {

    const text = `API Session ID: ${props.sessionId}`;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {
        props.eventBus.on(UIEventNames.Navigated, onNavigate);
    }

    function cleanup() {
        props.eventBus.detach(UIEventNames.Navigated, onNavigate);
    }

    /*
     * The session button state becomes disabled when the login required view is active
     */
    function onNavigate(event: NavigatedEvent) {
        setIsVisible(event.isAuthenticatedView);
    }

    return  (
        <>
            {isVisible &&
                <div className='sessionid text-end mx-auto'>
                    <small>{text}</small>
                </div>
            }
        </>
    );
}
