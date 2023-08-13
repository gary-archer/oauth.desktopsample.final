import React, {useEffect, useState} from 'react';
import {DataStatusEvent} from '../../plumbing/events/dataStatusEvent';
import {EventNames} from '../../plumbing/events/eventNames';
import {NavigateEvent} from '../../plumbing/events/navigateEvent';
import {HeaderButtonsViewProps} from './headerButtonsViewProps';
import {HeaderButtonsViewState} from './headerButtonsViewState';

/*
 * Render the header buttons
 */
export function HeaderButtonsView(props: HeaderButtonsViewProps): JSX.Element {

    const [state, setState] = useState<HeaderButtonsViewState>({
        hasData: false,
        isMainView: false,
    });

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    function startup() {
        props.eventBus.on(EventNames.DataStatus, onDataStatusUpdate);
        props.eventBus.on(EventNames.Navigate, onNavigate);
    }

    function cleanup() {
        props.eventBus.detach(EventNames.DataStatus, onDataStatusUpdate);
        props.eventBus.detach(EventNames.Navigate, onNavigate);
    }

    // Settings related to button long clicks
    const longPressMilliseconds = 2000;
    let longPressStartTime: number | null = null;

    /*
     * The session button state changes when data starts and ends loading
     */
    function onDataStatusUpdate(event: DataStatusEvent) {

        setState((s) => {
            return {
                ...s,
                hasData: event.loaded,
            };
        });
    }

    /*
     * The session button state becomes disabled when the login required view is active
     */
    function onNavigate(event: NavigateEvent) {
        setState((s) => {
            return {
                ...s,
                isMainView: event.isMainView,
            };
        });
    }

    /*
     * When refresh is clicked, measure the start time
     */
    function handleReloadPress(): void {

        if (!state.hasData || !state.isMainView) {
            return;
        }

        longPressStartTime = Date.now();
    }

    /*
     * The sample uses a long press to simulate an API 500 error, for demonstration purposes
     * Our solutions then demonstrate how it is reported in the UI and looked up via Elastic Search
     */
    function handleReloadRelease(): void {

        if (!state.hasData || !state.isMainView) {
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
     * Render buttons and callback the parent when clicked
     */
    const disabled = state.hasData && state.isMainView ? false : true;
    return  (
        <div className='row'>
            <div className='col col-one-fifth my-2 d-flex p-1'>
                <button
                    onClick={props.handleHomeClick}
                    className='btn btn-primary w-100 p-1'
                    type='button'
                >
                    <small>Home</small>
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
                    onClick={props.handleLogoutClick}
                    className='btn btn-primary w-100 p-1'
                    disabled={disabled}
                    type='button'
                >
                    <small>Logout</small>
                </button>
            </div>
        </div>
    );
}
