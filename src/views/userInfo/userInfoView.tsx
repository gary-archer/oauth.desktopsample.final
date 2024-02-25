import React, {useEffect} from 'react';
import {ErrorCodes} from '../../plumbing/errors/errorCodes';
import {NavigatedEvent} from '../../plumbing/events/navigatedEvent';
import {ReloadDataEvent} from '../../plumbing/events/reloadDataEvent';
import {UIEventNames} from '../../plumbing/events/uiEventNames';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {UserInfoViewProps} from './userInfoViewProps';

/*
 * A simple component to render the logged in user
 */
export function UserInfoView(props: UserInfoViewProps): JSX.Element {

    const model = props.viewModel;
    model.useState();

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    /*
     * Subscribe for load related events
     */
    async function startup(): Promise<void> {
        model.eventBus.on(UIEventNames.ReloadData, onReload);
        model.eventBus.on(UIEventNames.Navigated, onNavigate);
    }

    /*
     * Unsubscribe when we unload
     */
    function cleanup(): void {
        model.eventBus.detach(UIEventNames.ReloadData, onReload);
        model.eventBus.detach(UIEventNames.Navigated, onNavigate);
    }

    /*
     * Load or unload data based on navigation events
     */
    async function onNavigate(event: NavigatedEvent): Promise<void> {

        if (!event.isMainView) {
            model.unload();
        } else {
            await loadData();
        }
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
     * Get a name string using OAuth user info
     */
    function getUserNameForDisplay(): string {

        if (model.oauthUserInfo) {
            return `${model.oauthUserInfo.givenName} ${model.oauthUserInfo.familyName}`;
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

        if (!model.apiUserInfo?.regions || model.apiUserInfo.regions.length == 0) {
            return '';
        }

        const regions = model.apiUserInfo.regions.join(', ');
        return `[${regions}]`;
    }

    /*
     * Ask the model to load data, then update state
     */
    async function loadData(options?: ViewLoadOptions): Promise<void> {
        await model.callApi(options);
    }

    function getErrorProps(): ErrorSummaryViewProps {

        return {
            error: model.error!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'userinfo',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'User Info Error',
            centred: false,
        };
    }

    return (
        <>
            {model.error &&
                <div className='text-end mx-auto'>
                    <ErrorSummaryView {...getErrorProps()}/>
                </div>
            }
            {model.oauthUserInfo && model.apiUserInfo &&
                <div className='text-end mx-auto'>
                    <div className='fw-bold basictooltip'>{getUserNameForDisplay()}
                        <div className='basictooltiptext'>
                            <small>{getUserTitle()}</small>
                            <br />
                            <small>{getUserRegions()}</small>
                        </div>
                    </div>
                </div>
            }
        </>
    );
}
