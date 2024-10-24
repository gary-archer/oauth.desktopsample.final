import React, {useEffect} from 'react';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {NavigatedEvent} from '../events/navigatedEvent';
import {ReloadDataEvent} from '../events/reloadDataEvent';
import {UIEventNames} from '../events/uiEventNames';
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
        model.getEventBus().on(UIEventNames.ReloadData, onReload);
        model.getEventBus().on(UIEventNames.Navigated, onNavigate);
    }

    /*
     * Unsubscribe when we unload
     */
    function cleanup(): void {
        model.getEventBus().detach(UIEventNames.ReloadData, onReload);
        model.getEventBus().detach(UIEventNames.Navigated, onNavigate);
    }

    /*
     * Load or unload data based on navigation events
     */
    async function onNavigate(event: NavigatedEvent): Promise<void> {

        if (!event.getIsAuthenticatedView()) {
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
            causeError: event.getCauseError()
        };
        loadData(options);
    }

    /*
     * Get a name string using OAuth user info
     */
    function getUserNameForDisplay(): string {

        const oauthUserInfo = model.getOAuthUserInfo();
        if (oauthUserInfo) {
            return `${oauthUserInfo.givenName} ${oauthUserInfo.familyName}`;
        }

        return '';
    }

    /*
     * Show the user's title when the name is clicked
     */
    function getUserTitle(): string {
        return model.getApiUserInfo()?.title || '';
    }

    /*
     * Show the user's regions when the name is clicked
     */
    function getUserRegions(): string {

        const apiUserInfo = model.getApiUserInfo();
        if (!apiUserInfo?.regions || apiUserInfo.regions.length == 0) {
            return '';
        }

        const regions = apiUserInfo.regions.join(', ');
        return `[${regions}]`;
    }

    /*
     * Ask the model to load data, then update state
     */
    async function loadData(options?: ViewLoadOptions): Promise<void> {
        await model.callApi(options);
    }

    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: model.getError()!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'userinfo',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'User Info Error',
            centred: false,
        };
    }

    return (
        <>
            {model.getError() &&
                <div className='text-end mx-auto'>
                    <ErrorSummaryView {...getErrorProps()}/>
                </div>
            }
            {model.getOAuthUserInfo() && model.getApiUserInfo() &&
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
