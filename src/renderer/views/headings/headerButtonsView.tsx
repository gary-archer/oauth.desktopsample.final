import {JSX, useEffect, useState} from 'react';
import {NavigatedEvent} from '../events/navigatedEvent';
import {UIEventNames} from '../events/uiEventNames';
import {ViewModelFetchEvent} from '../events/viewModelFetchEvent';
import {HeaderButtonsViewProps} from './headerButtonsViewProps';

/*
 * Render the header buttons
 */
export function HeaderButtonsView(props: HeaderButtonsViewProps): JSX.Element {

    const [hasData, setHasData] = useState(false);
    const [homeTitle, setHomeTitle] = useState('');

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {
        props.eventBus.on(UIEventNames.ViewModelFetch, onViewModelFetch);
        props.eventBus.on(UIEventNames.Navigated, onNavigated);
    }

    function cleanup() {
        props.eventBus.detach(UIEventNames.ViewModelFetch, onViewModelFetch);
        props.eventBus.on(UIEventNames.Navigated, onNavigated);
    }

    // Settings related to button long clicks
    const longPressMilliseconds = 2000;
    let longPressStartTime: number | null = null;

    /*
     * The session button state changes when data starts and ends loading
     */
    function onViewModelFetch(event: ViewModelFetchEvent) {
        setHasData(event.getLoaded());
    }

    /*
     * Update different text and buttons depending on whether in an authenticated view
     */
    function onNavigated(event: NavigatedEvent) {

        if (event.getIsAuthenticatedView()) {

            setHomeTitle('Home');

        } else {

            setHomeTitle('Sign In');
            setHasData(false);
        }
    }

    /*
     * When refresh is clicked, measure the start time
     */
    function handleReloadPress(): void {

        if (!hasData) {
            return;
        }

        longPressStartTime = Date.now();
    }

    /*
     * The sample uses a long press to simulate an API 500 error, for demonstration purposes
     * Our solutions then demonstrate how it is reported in the UI and looked up via Elastic Search
     */
    function handleReloadRelease(): void {

        if (!hasData) {
            return;
        }

        if (isLongPress()) {

            // The button has been long pressed which we use as a trigger to simulate an exception
            // causeError = true means the UI to sends a header to the API to instruct it to simulate a 500 error
            props.handleReloadDataClick(true);

        } else {

            // In all other cases we reload data normally
            props.handleReloadDataClick(false);
        }
    }

    /*
     * A utility to calculate whether a long press has occurred
     */
    function isLongPress(): boolean {

        if (!longPressStartTime) {
            return false;
        }

        const timeTaken = Date.now() - longPressStartTime;
        longPressStartTime = null;
        return (timeTaken > longPressMilliseconds);
    }

    /*
     * Clear the model's data state and then call the parent
     */
    function onLogoutPressed() {
        setHasData(false);
        props.handleLogoutClick();
    }

    /*
     * Render buttons and callback the parent when clicked
     */
    const disabled = hasData ? false : true;
    return  (
        <div className='row'>
            <div className='col col-one-fifth my-2 d-flex p-1'>
                <button
                    onClick={props.handleHomeClick}
                    className='btn btn-primary w-100 p-1'
                    type='button'
                >
                    <small>{homeTitle}</small>
                </button>
            </div>
            <div
                className='col col-one-fifth my-2 d-flex p-1'
                onTouchStart={handleReloadPress}
                onTouchEnd={handleReloadRelease}
                onMouseDown={handleReloadPress}
                onMouseUp={handleReloadRelease}
            >
                <button
                    className='btn btn-primary w-100 p-1'
                    disabled={disabled}
                    type='button'
                >
                    <small>Reload Data</small>
                </button>
            </div>
            <div className='col col-one-fifth my-2 d-flex p-1'>
                <button
                    onClick={props.handleExpireAccessTokenClick}
                    className='btn btn-primary w-100 p-1'
                    disabled={disabled}
                    type='button'
                >
                    <small>Expire Access Token</small>
                </button>
            </div>
            <div className='col col-one-fifth my-2 d-flex p-1'>
                <button
                    onClick={props.handleExpireRefreshTokenClick}
                    className='btn btn-primary w-100 p-1'
                    disabled={disabled}
                    type='button'
                >
                    <small>Expire Refresh Token</small>
                </button>
            </div>
            <div className='col col-one-fifth my-2 d-flex p-1'>
                <button
                    onClick={onLogoutPressed}
                    className='btn btn-primary w-100 p-1'
                    disabled={disabled}
                    type='button'
                >
                    <small>Sign Out</small>
                </button>
            </div>
        </div>
    );
}
