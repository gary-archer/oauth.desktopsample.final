import React, {useEffect, useState} from 'react';
import {EventNames} from '../../plumbing/events/eventNames';
import {NavigateEvent} from '../../plumbing/events/navigateEvent';
import {SessionViewProps} from './sessionViewProps';

/*
 * Render the session id used by API logs once data is loaded
 */
export function SessionView(props: SessionViewProps): JSX.Element {

    const text = `API Session Id: ${props.sessionId}`;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {
        props.eventBus.on(EventNames.Navigate, onNavigate);
    }

    function cleanup() {
        props.eventBus.detach(EventNames.Navigate, onNavigate);
    }

    /*
     * The session button state becomes disabled when the login required view is active
     */
    function onNavigate(event: NavigateEvent) {
        setIsVisible(event.isMainView);
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
