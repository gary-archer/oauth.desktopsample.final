import React, {JSX, useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {NavigatedEvent} from '../events/navigatedEvent';
import {ReloadDataEvent} from '../events/reloadDataEvent';
import {UIEventNames} from '../events/uiEventNames';
import {CurrentLocation} from '../utilities/currentLocation';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {CompaniesContainerProps} from './companiesContainerProps';
import {CompaniesView} from './companiesView';
import {CompaniesViewProps} from './companiesViewProps';

/*
 * Render the companies view to replace the existing view
 */
export function CompaniesContainer(props: CompaniesContainerProps): JSX.Element {

    const model = props.viewModel;
    model.useState();
    CurrentLocation.path = useLocation().pathname;

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    /*
     * Subscribe for reload events and then do the initial load of data
     */
    async function startup(): Promise<void> {

        // Inform other parts of the app that the main view is active
        model.getEventBus().emit(UIEventNames.Navigated, null, new NavigatedEvent(true));

        // Subscribe for reload events
        model.getEventBus().on(UIEventNames.ReloadData, onReload);

        // Do the initial load of data
        await loadData();
    }

    /*
     * Unsubscribe when we unload
     */
    function cleanup(): void {
        model.getEventBus().detach(UIEventNames.ReloadData, onReload);
    }

    /*
     * Receive the reload event
     */
    function onReload(event: ReloadDataEvent): void {

        const options = {
            forceReload: true,
            causeError: event.getCauseError()
        };
        loadData(options);
    }

    /*
     * Get data from the API and update state
     */
    async function loadData(options?: ViewLoadOptions): Promise<void> {
        await model.callApi(options);
    }

    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: model.getError()!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'companies',
            hyperlinkMessage: 'Problem Encountered in Companies View',
            dialogTitle: 'Companies View Error',
            centred: true,
        };
    }

    function getChildProps(): CompaniesViewProps {

        return {
            companies: model.getCompanies(),
        };
    }

    return  (
        <>
            {model.getError() && <ErrorSummaryView {...getErrorProps()}/>}
            {model.getCompanies().length > 0 && <CompaniesView {...getChildProps()}/>}
        </>
    );
}
