import EventBus from 'js-event-bus';
import {Dispatch, SetStateAction, useState} from 'react';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {UIError} from '../../shared/errors/uiError';
import {FetchCache} from '../api/fetchCache';
import {FetchClient} from '../api/fetchClient';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {AuthenticatorClient} from '../oauth/authenticatorClient';
import {AuthenticatorClientImpl} from '../oauth/authenticatorClientImpl';
import {CompaniesContainerViewModel} from '../views/companies/companiesContainerViewModel';
import {ErrorConsoleReporter} from '../views/errors/errorConsoleReporter';
import {ReloadDataEvent} from '../views/events/reloadDataEvent';
import {UIEventNames} from '../views/events/uiEventNames';
import {TransactionsContainerViewModel} from '../views/transactions/transactionsContainerViewModel';
import {UserInfoViewModel} from '../views/userInfo/userInfoViewModel';
import {ViewModelCoordinator} from '../views/utilities/viewModelCoordinator';

/*
 * Global objects as input to the application view
 */
export class AppViewModel {

    // Infrastructure
    private readonly eventBus: EventBus;
    private readonly ipcEvents: IpcRendererEvents;
    private readonly fetchCache: FetchCache;

    // OAuth and API requests
    private readonly authenticatorClient: AuthenticatorClient;
    private readonly fetchClient: FetchClient;
    private readonly viewModelCoordinator: ViewModelCoordinator;

    // State
    private error: UIError | null;
    private isLoading: boolean;

    // Child view models
    private companiesViewModel: CompaniesContainerViewModel | null;
    private transactionsViewModel: TransactionsContainerViewModel | null;
    private userInfoViewModel: UserInfoViewModel | null;

    // Callbacks to set model properties that affect view rendering
    private setError: Dispatch<SetStateAction<UIError | null>> | null;

    /*
     * Set the initial state when the app starts
     */
    public constructor() {

        // Create objects used for coordination
        this.eventBus = new EventBus();
        this.fetchCache = new FetchCache();

        // Register to receive Electron events from the main side of the app
        this.ipcEvents = new IpcRendererEvents(this.eventBus);
        this.ipcEvents.register();

        // Create objects to manage OAuth and API requests
        this.authenticatorClient = new AuthenticatorClientImpl(this.ipcEvents);
        this.fetchClient = new FetchClient(this.fetchCache, this.ipcEvents, this.authenticatorClient);
        this.viewModelCoordinator = new ViewModelCoordinator(
            this.eventBus,
            this.fetchCache,
            this.authenticatorClient);

        // Initialise state
        this.error = null;
        this.isLoading = false;
        this.setError = null;

        // Initialise child view models
        this.companiesViewModel = null;
        this.transactionsViewModel = null;
        this.userInfoViewModel = null;
        this.setupCallbacks();
    }

    /*
     * For the correct React behavior, the view initialises state every time it loads
     */
    public useState(): void {

        const [, setError] = useState(this.error);
        this.setError = setError;
    }

    public getError(): UIError | null {
        return this.error;
    }

    public getAuthenticatorClient(): AuthenticatorClient {
        return this.authenticatorClient;
    }

    public getFetchClient(): FetchClient {
        return this.fetchClient;
    }

    public getEventBus(): EventBus {
        return this.eventBus;
    }

    /*
     * Initialise the application to finalize the view model
     */
    public async initialise(): Promise<void> {

        if (this.isLoading) {
            return;
        }

        try {

            // Prevent re-entrancy due to React strict mode
            this.isLoading = true;
            this.updateError(null);

            // If we were started via a deep link, navigate to that location
            await this.ipcEvents.setDeepLinkStartupUrlIfRequired();

        } catch (e: any) {

            // Store startup errors
            this.updateError(ErrorFactory.fromException(e));

        } finally {

            // Reset to allow retries
            this.isLoading = false;
        }
    }

    /*
     * Try to login and report errors
     */
    public async login(): Promise<void> {

        this.viewModelCoordinator.resetState();
        this.updateError(null);

        try {
            await this.authenticatorClient.login();

        } catch (e: any) {

            const error =  ErrorFactory.fromException(e);
            if (error.getErrorCode() !== ErrorCodes.loginCancelled) {
                this.updateError(error);
            }
        }
    }

    /*
     * Try to logout and silently report errors
     */
    public async logout(): Promise<void> {

        this.viewModelCoordinator.resetState();
        this.updateError(null);

        try {

            await this.authenticatorClient.logout();

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            ErrorConsoleReporter.output(error);
        }
    }

    public getCompaniesViewModel(): CompaniesContainerViewModel {

        if (!this.companiesViewModel) {

            this.companiesViewModel = new CompaniesContainerViewModel(
                this.fetchClient,
                this.eventBus,
                this.viewModelCoordinator,
            );
        }

        return this.companiesViewModel;
    }

    public getTransactionsViewModel(): TransactionsContainerViewModel {

        if (!this.transactionsViewModel) {

            this.transactionsViewModel = new TransactionsContainerViewModel
            (
                this.fetchClient,
                this.eventBus,
                this.viewModelCoordinator,
            );
        }

        return this.transactionsViewModel;
    }

    public getUserInfoViewModel(): UserInfoViewModel {

        if (!this.userInfoViewModel) {

            this.userInfoViewModel = new UserInfoViewModel(
                this.fetchClient,
                this.eventBus,
                this.viewModelCoordinator,
            );
        }

        return this.userInfoViewModel;
    }

    /*
     * For reliability testing, ask the OAuth agent to make the access token act expired, and handle errors
     */
    public async expireAccessToken(): Promise<void> {

        try {

            this.updateError(null);
            await this.authenticatorClient.expireAccessToken();

        } catch (e: any) {
            this.updateError(ErrorFactory.fromException(e));
        }
    }

    /*
     * For reliability testing, ask the OAuth agent to make the refresh token act expired, and handle errors
     */
    public async expireRefreshToken(): Promise<void> {

        try {

            this.updateError(null);
            await this.authenticatorClient.expireRefreshToken();

        } catch (e: any) {
            this.updateError(ErrorFactory.fromException(e));
        }
    }

    /*
     * Ask all views to get updated data from the API
     */
    public reloadData(causeError: boolean): void {

        this.updateError(null);
        this.viewModelCoordinator.resetState();
        this.eventBus.emit(UIEventNames.ReloadData, null, new ReloadDataEvent(causeError));
    }

    /*
     * See if there are any errors
     */
    public hasError(): boolean {
        return !!this.error || this.viewModelCoordinator.hasErrors();
    }

    /*
     * Update error state and the binding system
     */
    private updateError(error: UIError | null): void {

        this.error = error;
        if (this.setError) {
            this.setError(error);
        }
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.reloadData = this.reloadData.bind(this);
    }
}
