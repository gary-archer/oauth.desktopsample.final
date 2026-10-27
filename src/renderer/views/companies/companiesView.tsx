import {JSX, useEffect, useSyncExternalStore} from 'react';
import {Link, useLocation} from 'react-router';
import {Company} from '../../../shared/api/company';
import {GetOptions} from '../../../shared/api/getOptions';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {NavigatedEvent} from '../events/navigatedEvent';
import {ReloadDataEvent} from '../events/reloadDataEvent';
import {UIEventNames} from '../events/uiEventNames';
import {CurrentLocation} from '../utilities/currentLocation';
import {CompaniesViewProps} from './companiesViewProps';

/*
 * Render the companies view
 */
export function CompaniesView(props: CompaniesViewProps): JSX.Element {

    // Subscribe to state from the view model
    const model = props.viewModel;
    const {companies, error} = useSyncExternalStore(
        model.subscribe.bind(model),
        model.getSnapshot.bind(model),
    );

    // Update the current path
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
        const options = {
            forceReload: false,
            causeError: false,
        };
        await loadData(options);
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
     * Get data from the API; the view model notifies subscribers when done
     */
    async function loadData(options: GetOptions): Promise<void> {
        await model.callApi(options);
    }

    /*
     * Get properties for the error view
     */
    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: error!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'companies',
            hyperlinkMessage: 'Problem Encountered in Companies View',
            dialogTitle: 'Companies View Error',
            centred: true,
        };
    }

    /*
     * Render a single company as a row
     */
    function renderListRow(company: Company): JSX.Element {

        return (
            <div key={company.id} className='grid grid-cols-12 px-3 py-3 mt-5'>
                <div className='col-span-2 text-center'>
                    {company.name}
                </div>
                <div className='col-span-2 text-center'>
                    {company.region}
                </div>
                <div className='col-span-2 text-center'>
                    <Link to={`/companies/${company.id}`} className='text-blue-600 underline'>
                        View Transactions
                    </Link>
                </div>
                <div className='col-span-2 text-green-700 font-bold text-right'>
                    {Number(company.targetUsd).toLocaleString()}
                </div>
                <div className='col-span-2 text-green-700 font-bold text-right'>
                    {Number(company.investmentUsd).toLocaleString()}
                </div>
                <div className='col-span-2 font-bold text-right'>
                    {company.noInvestors}
                </div>
            </div>
        );
    }

    /*
     * Render the list of companies
     */
    function renderList(): JSX.Element {

        return  (
            <div className='mt-3'>
                <div className='grid grid-cols-12 bg-gray-100 px-3 py-3'>
                    <div className='col-span-2 font-bold text-center'>Account</div>
                    <div className='col-span-2 font-bold text-center'>Region</div>
                    <div className='col-span-2' />
                    <div className='col-span-2 font-bold text-right'>Target USD</div>
                    <div className='col-span-2 font-bold text-right'>Investment USD</div>
                    <div className='col-span-2 font-bold text-right'># Investors</div>
                </div>
                <div>
                    {companies.map((company) => renderListRow(company))}
                </div>
            </div>
        );
    }

    return  (
        <>
            {error && <ErrorSummaryView {...getErrorProps()}/>}
            {companies.length > 0 && renderList()}
        </>
    );
}
