import EventBus from 'js-event-bus';
import {FetchCacheKeys} from '../../api/client/fetchCacheKeys';
import {FetchClient} from '../../api/client/fetchClient';
import {CompanyTransactions} from '../../api/entities/companyTransactions';
import {ErrorCodes} from '../../plumbing/errors/errorCodes';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {UIError} from '../../plumbing/errors/uiError';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {ViewModelCoordinator} from '../utilities/viewModelCoordinator';

/*
 * The view model for the transactions container view
 */
export class TransactionsContainerViewModel {

    private readonly _fetchClient: FetchClient;
    private readonly _eventBus: EventBus;
    private readonly _viewModelCoordinator: ViewModelCoordinator;
    private _companyId: string | null;
    private _transactions: CompanyTransactions | null;
    private _error: UIError | null;

    public constructor(
        fetchClient: FetchClient,
        eventBus: EventBus,
        viewModelCoordinator: ViewModelCoordinator,
    ) {
        this._fetchClient = fetchClient;
        this._eventBus = eventBus;
        this._viewModelCoordinator = viewModelCoordinator;
        this._companyId = null;
        this._transactions = null;
        this._error = null;
    }

    /*
     * Property accessors
     */
    public get transactions(): CompanyTransactions | null {
        return this._transactions;
    }

    public get companyId(): string {
        return this._companyId!;
    }

    public get error(): UIError | null {
        return this._error;
    }

    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Get data from the API, and trigger a new login only once when the session expires
     */
    public async callApi(id: string, options?: ViewLoadOptions): Promise<void> {

        const fetchOptions = {
            cacheKey: `${FetchCacheKeys.Transactions}-${id}`,
            forceReload: options?.forceReload || false,
            causeError: options?.causeError || false,
        };

        this._viewModelCoordinator.onMainViewModelLoading();
        this._companyId = id;
        this._error = null;
        this._transactions = null;

        try {

            const result = await this._fetchClient.getCompanyTransactions(id, fetchOptions);
            if (result) {
                this._transactions = result;
            }

        } catch (e: any) {

            this._error = ErrorFactory.fromException(e);
            this._transactions = null;

        } finally {

            this._viewModelCoordinator.onMainViewModelLoaded(fetchOptions.cacheKey);
        }
    }

    /*
     * Allow the view to clear data
     */
    public clearData(): void {
        this._transactions = null;
    }

    /*
     * Handle 'business errors' received from the API
     */
    public isForbiddenError(): boolean {

        if(this._error) {

            if (this._error.statusCode === 404 && this._error.errorCode === ErrorCodes.companyNotFound) {

                // User typed an id value outside of allowed company ids
                return true;
            }

            if (this._error.statusCode === 400 && this._error.errorCode === ErrorCodes.invalidCompanyId) {

                // User typed an invalid id such as 'abc'
                return true;
            }
        }

        return false;
    }
}
