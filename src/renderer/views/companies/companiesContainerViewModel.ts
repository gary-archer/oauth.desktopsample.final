import EventBus from 'js-event-bus';
import {Dispatch, SetStateAction, useState} from 'react';
import {Company} from '../../../shared/api/company';
import {ErrorFactory} from '../../../shared/errors/errorFactory';
import {UIError} from '../../../shared/errors/uiError';
import {FetchCacheKeys} from '../../api/client/fetchCacheKeys';
import {FetchClient} from '../../api/client/fetchClient';
import {ViewLoadOptions} from '../utilities/viewLoadOptions';
import {ViewModelCoordinator} from '../utilities/viewModelCoordinator';

/*
 * The view model for the companies container view
 */
export class CompaniesContainerViewModel {

    private readonly _fetchClient: FetchClient;
    private readonly _eventBus: EventBus;
    private readonly _viewModelCoordinator: ViewModelCoordinator;
    private _companies: Company[];
    private _error: UIError | null;
    private _setCompanies: Dispatch<SetStateAction<Company[]>> | null;
    private _setError: Dispatch<SetStateAction<UIError | null>> | null;

    public constructor(
        fetchClient: FetchClient,
        eventBus: EventBus,
        viewModelCoordinator: ViewModelCoordinator,
    ) {
        this._fetchClient = fetchClient;
        this._eventBus = eventBus;
        this._viewModelCoordinator = viewModelCoordinator;
        this._companies = [];
        this._error = null;
        this._setCompanies = null;
        this._setError = null;
    }

    /*
     * For the correct React behavior, the view initialises state every time it loads
     */
    public useState(): void {

        const [, setCompanies] = useState(this._companies);
        this._setCompanies = setCompanies;

        const [, setError] = useState(this._error);
        this._setError = setError;
    }

    /*
     * Property accessors
     */
    public get companies(): Company[] {
        return this._companies;
    }

    public get error(): UIError | null {
        return this._error;
    }

    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Get data from the API and then notify the caller
     */
    public async callApi(options?: ViewLoadOptions): Promise<void> {

        const fetchOptions = {
            cacheKey: FetchCacheKeys.Companies,
            forceReload: options?.forceReload || false,
            causeError: options?.causeError || false,
        };

        this._viewModelCoordinator.onMainViewModelLoading();
        this._updateError(null);

        try {

            const result = await this._fetchClient.getCompanyList(fetchOptions);
            if (result) {
                this._updateCompanies(result);
            }

        } catch (e: any) {

            this._updateCompanies([]);
            this._updateError(ErrorFactory.fromException(e));

        } finally {

            await this._viewModelCoordinator.onMainViewModelLoaded(fetchOptions.cacheKey);
        }
    }

    /*
     * Update state and the binding system
     */
    private _updateCompanies(companies: Company[]): void {

        this._companies = companies;
        if (this._setCompanies) {
            this._setCompanies(companies);
        }
    }

    /*
     * Update state and the binding system
     */
    private _updateError(error: UIError | null): void {

        this._error = error;
        if (this._setError) {
            this._setError(error);
        }
    }
}
