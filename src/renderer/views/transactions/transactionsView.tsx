import {JSX, useEffect, useSyncExternalStore} from 'react';
import {useLocation, useParams} from 'react-router';
import {Transaction} from '../../../shared/api/transaction';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {ErrorSummaryView} from '../errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../errors/errorSummaryViewProps';
import {ApiRequestEvent} from '../events/apiRequestEvent';
import {NavigatedEvent} from '../events/navigatedEvent';
import {ReloadDataEvent} from '../events/reloadDataEvent';
import {UIEventNames} from '../events/uiEventNames';
import {CurrentLocation} from '../utilities/currentLocation';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {TransactionsViewProps} from './transactionsViewProps';

/*
 * Render the transactions view
 */
export function TransactionsView(props: TransactionsViewProps): JSX.Element {

    // Subscribe to state from the view model
    const model = props.viewModel;
    const {data, error} = useSyncExternalStore(
        model.subscribe.bind(model),
        model.getSnapshot.bind(model),
    );

    CurrentLocation.path = useLocation().pathname;
    const params = useParams();
    const companyId = params.id || '';

    useEffect(() => {
        startup();
        return () => cleanup();
    }, [companyId]);

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
    async function loadData(options: ViewLoadOptions): Promise<void> {

        // Forbidden errors are expected if the user edits the browser URL
        // Treat the API request as successfully completed and navigate back to the home view
        const onForbidden = () => {
            model.getEventBus().emit(UIEventNames.ApiRequest, null, new ApiRequestEvent(true));
            props.navigate('/');
        };

        await model.callApi(companyId, options, onForbidden);
    }

    /*
     * Get properties for the error view
     */
    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: error!,
            errorsToIgnore: [ErrorCodes.loginRequired],
            containingViewName: 'transactions',
            hyperlinkMessage: 'Problem Encountered in Transactions View',
            dialogTitle: 'Transactions View Error',
            centred: true,
        };
    }

    /*
     * Render a transaction as a card
     */
    function renderTransaction(transaction: Transaction): JSX.Element {

        return (
            <div key={transaction.id} className='rounded-lg border border-gray-300 p-3'>
                <div className='flex mt-1'>
                    <div className='w-1/2'>
                        Transaction ID
                    </div>
                    <div className='w-1/2 text-right font-bold text-blue-700'>
                        {transaction.id}
                    </div>
                </div>
                <div className='flex mt-1'>
                    <div className='w-1/2'>
                        Investor ID
                    </div>
                    <div className='w-1/2 text-right font-bold text-blue-700'>
                        {transaction.investorId}
                    </div>
                </div>
                <div className='flex mt-1'>
                    <div className='w-1/2'>
                        Amount USD
                    </div>
                    <div className='w-1/2 text-right font-bold text-green-700'>
                        {Number(transaction.amountUsd).toLocaleString()}
                    </div>
                </div>
            </div>
        );
    }

    /*
     * Render the collection of transactions
     */
    function renderData(): JSX.Element {

        return (
            <div className='mt-3'>
                <div className='bg-gray-100 p-3 text-center font-bold'>
                    Today&apos;s Transactions for {data!.company.name}
                </div>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 p-3'>
                    {data!.transactions.map((transaction) => renderTransaction(transaction))}
                </div>
            </div>
        );
    }

    return  (
        <>
            {error && <ErrorSummaryView {...getErrorProps()}/>}
            {data && renderData()}
        </>
    );
}
