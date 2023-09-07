import React, {useEffect, useState} from 'react';
import {ErrorCodes} from '../../plumbing/errors/errorCodes';
import {EventNames} from '../../plumbing/events/eventNames';
import {NavigateEvent} from '../../plumbing/events/navigateEvent';
import {ReloadDataEvent} from '../../plumbing/events/reloadDataEvent';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {UserInfoViewProps} from './userInfoViewProps';
import {UserInfoViewState} from './userInfoViewState';

/*
 * A simple component to render the logged in user
 */
export function UserInfoView(props: UserInfoViewProps): JSX.Element {

    const model = props.viewModel;
    const [state, setState] = useState<UserInfoViewState>({
        oauthUserInfo: model.oauthUserInfo,
        apiUserInfo: model.apiUserInfo,
        error: null,
        showUserDescription: false,
    });

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    /*
     * Subscribe for reload events and then do the initial load of data
     */
    async function startup(): Promise<void> {
        model.eventBus.on(EventNames.Navigate, onNavigate);
        model.eventBus.on(EventNames.ReloadData, onReload);
        await loadData();
    }

    /*
     * Unsubscribe when we unload
     */
    function cleanup(): void {
        model.eventBus.detach(EventNames.Navigate, onNavigate);
        model.eventBus.detach(EventNames.ReloadData, onReload);
    }

    /*
     * Load data when in a main view
     */
    async function onNavigate(event: NavigateEvent): Promise<void> {

        if (event.isMainView) {

            // Load user data the first time
            await loadData();

        } else {

            // If in the login required view we clear user data
            model.unload();
        }

        setState((s) => {
            return {
                ...s,
                oauthUserInfo: model.oauthUserInfo,
                apiUserInfo : model.apiUserInfo,
                error: model.error,
            };
        });
    }

    /*
     * Process the reload event
     */
    function onReload(event: ReloadDataEvent): void {

        const options = {
            forceReload: true,
            causeError: event.causeError
        };
        loadData(options);
    }

    /*
     * Get a name string from both OAuth user info
     */
    function getUserNameForDisplay(): string {

        if (state.oauthUserInfo) {
            return `${state.oauthUserInfo.givenName} ${state.oauthUserInfo.familyName}`;
        }

        return '';
    }

    /*
     * Show the user's title when the name is clicked
     */
    function getUserTitle(): string {
        return model.apiUserInfo?.title || '';
    }

    /*
     * Show the user's regions when the name is clicked
     */
    function getUserRegions(): string {

        const regions = model.apiUserInfo?.regions.join(', ');
        return `[${regions}]`;
    }

    /*
     * Ask the model to load data, then update state
     */
    async function loadData(options?: ViewLoadOptions): Promise<void> {

        await model.callApi(options);
        setState((s) => {
            return {
                ...s,
                oauthUserInfo: model.oauthUserInfo,
                apiUserInfo : model.apiUserInfo,
                error: model.error,
            };
        });
    }

    function getErrorProps(): ErrorSummaryViewProps {

        return {
            error: state.error!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'userinfo',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'User Info Error',
            centred: false,
        };
    }

    return (
        <>
            {state.error && <div className='text-end mx-auto'>
                <ErrorSummaryView {...getErrorProps()}/>
            </div>}
            {state.oauthUserInfo && state.apiUserInfo &&
            <div className='text-end mx-auto'>
                <div className='fw-bold basictooltip'>{getUserNameForDisplay()}
                    <div className='basictooltiptext'>
                        <small>{getUserTitle()}</small>
                        <br />
                        <small>{getUserRegions()}</small>
                    </div>
                </div>
            </div>}
        </>
    );
}
