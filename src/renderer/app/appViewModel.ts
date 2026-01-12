import EventBus from 'js-event-bus';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {UIError} from '../../shared/errors/uiError';
import {FetchCache} from '../api/fetchCache';
import {FetchClient} from '../api/fetchClient';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {OAuthClient} from '../oauth/oauthClient';
import {OAuthClientImpl} from '../oauth/oauthClientImpl';
import {CompaniesViewModel} from '../views/companies/companiesViewModel';
import {ErrorConsoleReporter} from '../views/errors/errorConsoleReporter';
import {ReloadDataEvent} from '../views/events/reloadDataEvent';
import {UIEventNames} from '../views/events/uiEventNames';
import {TransactionsViewModel} from '../views/transactions/transactionsViewModel';
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
    private readonly oauthClient: OAuthClient;
    private readonly fetchClient: FetchClient;
    private readonly viewModelCoordinator: ViewModelCoordinator;

    // State
    private error: UIError | null;
    private sessionId: string;
    private isLoading: boolean;

    // Child view models
    private companiesViewModel: CompaniesViewModel | null;
    private transactionsViewModel: TransactionsViewModel | null;
    private userInfoViewModel: UserInfoViewModel | null;

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
        this.oauthClient = new OAuthClientImpl(this.ipcEvents);
        this.fetchClient = new FetchClient(this.fetchCache, this.ipcEvents, this.oauthClient);
        this.viewModelCoordinator = new ViewModelCoordinator(this.eventBus, this.fetchCache);

        // Initialise state
        this.error = null;
        this.sessionId = '';
        this.isLoading = false;

        // Initialise child view models
        this.companiesViewModel = null;
        this.transactionsViewModel = null;
        this.userInfoViewModel = null;
        this.setupCallbacks();
    }

    public getError(): UIError | null {
        return this.error;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    public getOAuthClient(): OAuthClient {
        return this.oauthClient;
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
            this.error = null;

            // If we were started via a deep link, navigate to that location
            await this.ipcEvents.setDeepLinkStartupUrlIfRequired();

            // Call the OAuth client to see if there is a session with stored tokens
            await this.oauthClient.getSession();
            this.sessionId = this.oauthClient.getDelegationId();

        } catch (e: any) {

            // Store startup errors
            this.error = ErrorFactory.fromException(e);

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
        this.error = null;

        try {
            await this.oauthClient.login();
            this.sessionId = this.oauthClient.getDelegationId();

        } catch (e: any) {

            const error =  ErrorFactory.fromException(e);
            if (error.getErrorCode() !== ErrorCodes.loginCancelled) {
                this.error = error;
            }
        }
    }

    /*
     * Try to logout and silently report errors
     */
    public async logout(): Promise<void> {

        this.viewModelCoordinator.resetState();
        this.error = null;

        try {

            await this.oauthClient.logout();
            this.sessionId = this.oauthClient.getDelegationId();

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            ErrorConsoleReporter.output(error);
        }
    }

    public getCompaniesViewModel(): CompaniesViewModel {

        if (!this.companiesViewModel) {

            this.companiesViewModel = new CompaniesViewModel(
                this.fetchClient,
                this.eventBus,
                this.viewModelCoordinator,
            );
        }

        return this.companiesViewModel;
    }

    public getTransactionsViewModel(): TransactionsViewModel {

        if (!this.transactionsViewModel) {

            this.transactionsViewModel = new TransactionsViewModel
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

            this.error = null;
            await this.oauthClient.expireAccessToken();

        } catch (e: any) {
            this.error = ErrorFactory.fromException(e);
        }
    }

    /*
     * For reliability testing, ask the OAuth agent to make the refresh token act expired, and handle errors
     */
    public async expireRefreshToken(): Promise<void> {

        try {

            this.error = null;
            await this.oauthClient.expireRefreshToken();

        } catch (e: any) {
            this.error = ErrorFactory.fromException(e);
        }
    }

    /*
     * Raise an event to ask all views to get updated data from the API
     */
    public triggerDataReload(causeError: boolean): void {

        this.error = null;
        this.viewModelCoordinator.resetState();
        this.eventBus.emit(UIEventNames.ReloadData, null, new ReloadDataEvent(causeError));
    }

    /*
     * See if there are any errors
     */
    public hasApiError(): boolean {
        return !!this.error || this.viewModelCoordinator.hasErrors();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.triggerDataReload = this.triggerDataReload.bind(this);
    }
}
