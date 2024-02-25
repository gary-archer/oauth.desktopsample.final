import EventBus from 'js-event-bus';
import {Dispatch, SetStateAction, useState} from 'react';
import {FetchCache} from '../api/client/fetchCache';
import {FetchClient} from '../api/client/fetchClient';
import {ErrorConsoleReporter} from '../plumbing/errors/errorConsoleReporter';
import {ErrorFactory} from '../plumbing/errors/errorFactory';
import {UIError} from '../plumbing/errors/uiError';
import {ReloadDataEvent} from '../plumbing/events/reloadDataEvent';
import {UIEventNames} from '../plumbing/events/uiEventNames';
import {RendererEvents} from '../plumbing/ipc/rendererEvents';
import {AuthenticatorClient} from '../plumbing/oauth/authenticatorClient';
import {AuthenticatorClientImpl} from '../plumbing/oauth/authenticatorClientImpl';
import {CompaniesContainerViewModel} from '../views/companies/companiesContainerViewModel';
import {TransactionsContainerViewModel} from '../views/transactions/transactionsContainerViewModel';
import {UserInfoViewModel} from '../views/userInfo/userInfoViewModel';
import {ViewModelCoordinator} from '../views/utilities/viewModelCoordinator';

/*
 * Global objects as input to the application view
 */
export class AppViewModel {

    // Infrastructure
    private readonly _eventBus: EventBus;
    private readonly _ipcEvents: RendererEvents;
    private readonly _fetchCache: FetchCache;

    // OAuth and API requests
    private readonly _authenticatorClient: AuthenticatorClient;
    private readonly _fetchClient: FetchClient;
    private readonly _viewModelCoordinator: ViewModelCoordinator;

    // State
    private _error: UIError | null;
    private _isLoading: boolean;

    // Child view models
    private _companiesViewModel: CompaniesContainerViewModel | null;
    private _transactionsViewModel: TransactionsContainerViewModel | null;
    private _userInfoViewModel: UserInfoViewModel | null;

    // Callbacks to set model properties that affect view rendering
    private _setError: Dispatch<SetStateAction<UIError | null>> | null;

    /*
     * Set the initial state when the app starts
     */
    public constructor() {

        // Create objects used for coordination
        this._eventBus = new EventBus();
        this._fetchCache = new FetchCache();

        // Register to receive Electron events from the main side of the app
        this._ipcEvents = new RendererEvents(this._eventBus);
        this._ipcEvents.register();

        // Create objects to manage OAuth and API requests
        this._authenticatorClient = new AuthenticatorClientImpl(this._ipcEvents);
        this._fetchClient = new FetchClient(this._fetchCache, this._ipcEvents, this.authenticatorClient);
        this._viewModelCoordinator = new ViewModelCoordinator(
            this._eventBus,
            this._fetchCache,
            this._authenticatorClient);

        // Initialise state
        this._error = null;
        this._isLoading = false;
        this._setError = null;

        // Initialise child view models
        this._companiesViewModel = null;
        this._transactionsViewModel = null;
        this._userInfoViewModel = null;
        this._setupCallbacks();
    }

    /*
     * For the correct React behavior, the view initialises state every time it loads
     */
    public useState(): void {

        const [, setError] = useState(this._error);
        this._setError = setError;
    }

    public get error(): UIError | null {
        return this._error;
    }

    public get authenticatorClient(): AuthenticatorClient {
        return this._authenticatorClient;
    }

    public get fetchClient(): FetchClient {
        return this._fetchClient;
    }

    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Initialise the application to finalize the view model
     */
    public async initialise(): Promise<void> {

        if (this._isLoading) {
            return;
        }

        try {

            // Prevent re-entrancy due to React strict mode
            this._isLoading = true;
            this._updateError(null);

            // If we were started via a deep link, navigate to that location
            await this._ipcEvents.setDeepLinkStartupUrlIfRequired();

        } catch (e: any) {

            // Store startup errors
            this._updateError(ErrorFactory.fromException(e));

        } finally {

            // Reset to allow retries
            this._isLoading = false;
        }
    }

    /*
     * Try to login and report errors
     */
    public async login(): Promise<void> {

        this._fetchCache.clearAll();
        this._viewModelCoordinator!.resetState();
        this._updateError(null);

        try {
            await this._authenticatorClient!.login();

        } catch (e: any) {
            this._updateError(ErrorFactory.fromException(e));
        }
    }

    /*
     * Try to logout and silently report errors
     */
    public async logout(): Promise<void> {

        this._fetchCache.clearAll();
        this._viewModelCoordinator!.resetState();
        this._updateError(null);

        try {

            await this._authenticatorClient!.logout();

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            ErrorConsoleReporter.output(error);
        }
    }

    public getCompaniesViewModel(): CompaniesContainerViewModel {

        if (!this._companiesViewModel) {

            this._companiesViewModel = new CompaniesContainerViewModel(
                this._fetchClient!,
                this._eventBus,
                this._viewModelCoordinator!,
            );
        }

        return this._companiesViewModel;
    }

    public getTransactionsViewModel(): TransactionsContainerViewModel {

        if (!this._transactionsViewModel) {

            this._transactionsViewModel = new TransactionsContainerViewModel
            (
                this._fetchClient!,
                this._eventBus,
                this._viewModelCoordinator!,
            );
        }

        return this._transactionsViewModel;
    }

    public getUserInfoViewModel(): UserInfoViewModel {

        if (!this._userInfoViewModel) {

            this._userInfoViewModel = new UserInfoViewModel(
                this.fetchClient!,
                this._eventBus,
                this._viewModelCoordinator!,
            );
        }

        return this._userInfoViewModel;
    }

    /*
     * For reliability testing, ask the OAuth agent to make the access token act expired, and handle errors
     */
    public async expireAccessToken(): Promise<void> {

        try {

            this._updateError(null);
            await this._authenticatorClient?.expireAccessToken();

        } catch (e: any) {
            this._updateError(ErrorFactory.fromException(e));
        }
    }

    /*
     * For reliability testing, ask the OAuth agent to make the refresh token act expired, and handle errors
     */
    public async expireRefreshToken(): Promise<void> {

        try {

            this._updateError(null);
            await this._authenticatorClient?.expireRefreshToken();

        } catch (e: any) {
            this._updateError(ErrorFactory.fromException(e));
        }
    }

    /*
     * Ask all views to get updated data from the API
     */
    public reloadData(causeError: boolean): void {

        this._updateError(null);
        this._viewModelCoordinator!.resetState();
        this._eventBus.emit(UIEventNames.ReloadData, null, new ReloadDataEvent(causeError));
    }

    /*
     * See if there are any errors
     */
    public hasError(): boolean {
        return !!this._error || this._viewModelCoordinator!.hasErrors();
    }

    /*
     * Update error state and the binding system
     */
    private _updateError(error: UIError | null): void {
        this._error = error;
        this._setError!(error);
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.reloadData = this.reloadData.bind(this);
    }
}
