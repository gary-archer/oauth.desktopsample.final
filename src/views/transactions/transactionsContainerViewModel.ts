import EventBus from 'js-event-bus';
import {ApiClient} from '../../api/client/apiClient';
import {CompanyTransactions} from '../../api/entities/companyTransactions';
import {ErrorCodes} from '../../plumbing/errors/errorCodes';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {UIError} from '../../plumbing/errors/uiError';
import {ApiViewEvents} from '../utilities/apiViewEvents';
import {ApiViewNames} from '../utilities/apiViewNames';

/*
 * The view model for the transactions container view
 */
export class TransactionsContainerViewModel {

    private readonly _apiClient: ApiClient;
    private readonly _eventBus: EventBus;
    private readonly _apiViewEvents: ApiViewEvents;

    public constructor(
        apiClient: ApiClient,
        eventBus: EventBus,
        apiViewEvents: ApiViewEvents,
    ) {
        this._apiClient = apiClient;
        this._eventBus = eventBus;
        this._apiViewEvents = apiViewEvents;
    }

    /*
     * Property accessors
     */
    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Get data from the API and then notify the caller
     */
    public async callApi(
        id: string,
        onSuccess: (transactions: CompanyTransactions) => void,
        onError: (isExpected: boolean, error: UIError) => void,
        causeError: boolean): Promise<void> {

        try {

            this._apiViewEvents.onViewLoading(ApiViewNames.Main);

            const transactions = await this._apiClient.getCompanyTransactions(id, {causeError});

            this._apiViewEvents.onViewLoaded(ApiViewNames.Main);
            onSuccess(transactions);

        } catch (e) {

            const error = ErrorFactory.fromException(e);
            this._apiViewEvents.onViewLoadFailed(ApiViewNames.Main, error);
            onError(this._isExpectedApiError(error), error);
        }
    }

    /*
     * Handle 'business errors' received from the API
     */
    private _isExpectedApiError(error: UIError): boolean {

        if (error.statusCode === 404 && error.errorCode === ErrorCodes.companyNotFound) {

            // User typed an id value outside of allowed company ids
            return true;

        }

        if (error.statusCode === 400 && error.errorCode === ErrorCodes.invalidCompanyId) {

            // User typed an invalid id such as 'abc'
            return true;
        }

        return false;
    }
}
