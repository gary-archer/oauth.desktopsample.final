import EventBus from 'js-event-bus';
import {FetchCache} from '../api/client/fetchCache';
import {FetchClient} from '../api/client/fetchClient';
import {Configuration} from '../configuration/configuration';
import {ErrorConsoleReporter} from '../plumbing/errors/errorConsoleReporter';
import {ErrorFactory} from '../plumbing/errors/errorFactory';
import {UIError} from '../plumbing/errors/uiError';
import {EventNames} from '../plumbing/events/eventNames';
import {ReloadDataEvent} from '../plumbing/events/reloadDataEvent';
import {RendererEvents} from '../plumbing/ipc/rendererEvents';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {AuthenticatorImpl} from '../plumbing/oauth/authenticatorImpl';
import {CompaniesContainerViewModel} from '../views/companies/companiesContainerViewModel';
import {TransactionsContainerViewModel} from '../views/transactions/transactionsContainerViewModel';
import {UserInfoViewModel} from '../views/userInfo/userInfoViewModel';
import {ViewModelCoordinator} from '../views/utilities/viewModelCoordinator';

/*
 * Global objects as input to the application view
 */
export class AppViewModel {

    // Global objects
    private _configuration: Configuration | null;
    private _authenticator: Authenticator | null;
    private _fetchClient: FetchClient | null;

    // Other infrastructure
    private _eventBus: EventBus;
    private _ipcEvents: RendererEvents;
    private readonly _fetchCache: FetchCache;
    private readonly _viewModelCoordinator: ViewModelCoordinator;

    // Child view models
    private _companiesViewModel: CompaniesContainerViewModel | null;
    private _transactionsViewModel: TransactionsContainerViewModel | null;
    private _userInfoViewModel: UserInfoViewModel | null;

    // State flags
    private _error: UIError | null;
    private _isInitialising: boolean;
    private _isInitialised: boolean;

    /*
     * Set the initial state when the app starts
     */
    public constructor() {

        // Objects that need configuration are initially null
        this._configuration = null;
        this._authenticator = null;
        this._fetchClient = null;

        // Create objects used for coordination
        this._eventBus = new EventBus();
        this._fetchCache = new FetchCache();
        this._viewModelCoordinator = new ViewModelCoordinator(this._eventBus, this._fetchCache);

        // Register to receive Electron events from the main side of the app
        this._ipcEvents = new RendererEvents(this._eventBus);
        this._ipcEvents.register();

        // Child view models
        this._companiesViewModel = null;
        this._transactionsViewModel = null;
        this._userInfoViewModel = null;

        // Top level error state
        this._error = null;

        // State flags
        this._isInitialising = false;
        this._isInitialised = false;
        this._setupCallbacks();
    }

    /*
     * Return details to the view
     */
    public get isInitialised(): boolean {
        return this._isInitialised;
    }

    public get error(): UIError | null {
        return this._error;
    }

    public get configuration(): Configuration {
        return this._configuration!;
    }

    public get authenticator(): Authenticator {
        return this._authenticator!;
    }

    public get fetchClient(): FetchClient {
        return this._fetchClient!;
    }

    public get eventBus(): EventBus {
        return this._eventBus;
    }

    /*
     * Some global objects are created after downloading configuration, which is only done once
     * The app view can be created many times and will get the same instance of the model
     */
    public async initialise(): Promise<void> {

        if (this._isInitialised || this._isInitialising) {
            return;
        }

        try {

            // Prevent re-entrancy due to React strict mode
            this._isInitialising = true;
            this._error = null;

            // Load configuration from the main side of the app
            this._configuration = await this._ipcEvents.loadConfiguration();

            // Initialize OpenID Connect handling
            this._authenticator = new AuthenticatorImpl(this.configuration.oauth, this._ipcEvents);
            await this._authenticator.initialise();

            // Create a client for calling the API
            this._fetchClient = new FetchClient(
                this.configuration,
                this._fetchCache,
                this._authenticator);

            // Update state, to prevent model recreation if the view is recreated
            this._isInitialised = true;

            // If we were started via a deep link, navigate to that location
            await this._ipcEvents.setDeepLinkStartupUrlIfRequired();

        } catch (e: any) {

            // Store startup errors
            this._error = ErrorFactory.fromException(e);

        } finally {

            // Reset to allow retries
            this._isInitialising = false;
        }
    }

    /*
     * Return child view models when requested
     */
    public getCompaniesViewModel(): CompaniesContainerViewModel {

        if (!this._companiesViewModel) {

            this._companiesViewModel = new CompaniesContainerViewModel(
                this._fetchClient!,
                this._eventBus,
                this._viewModelCoordinator,
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
                this._viewModelCoordinator,
            );
        }

        return this._transactionsViewModel;
    }

    public getUserInfoViewModel(): UserInfoViewModel {

        if (!this._userInfoViewModel) {

            this._userInfoViewModel = new UserInfoViewModel(
                this.fetchClient!,
                this._eventBus,
                this._viewModelCoordinator,
            );
        }

        return this._userInfoViewModel;
    }

    /*
     * Try to login and report errors
     */
    public async login(): Promise<void> {

        // Reset cached state for API requests
        this._fetchCache.clearAll();
        this._viewModelCoordinator.resetState();

        try {

            // Try the login
            this._error = null;
            await this._authenticator?.login();

        } catch (e: any) {

            // Handle errors
            this._error = ErrorFactory.fromException(e);
        }
    }

    /*
     * Try to logout and silently report errors
     */
    public async logout(): Promise<void> {

        // Reset cached state for API requests
        this._fetchCache.clearAll();
        this._viewModelCoordinator.resetState();

        try {

            // Try the logout
            this._error = null;
            await this._authenticator?.logout();

        } catch (e: any) {

            // Only output logout errors to the console
            const error = ErrorFactory.fromException(e);
            ErrorConsoleReporter.output(error);
        }
    }

    /*
     * For reliability testing, ask the OAuth agent to make the access token act expired, and handle errors
     */
    public async expireAccessToken(): Promise<void> {

        try {

            // Try the operation
            this._error = null;
            await this._authenticator?.expireAccessToken();

        } catch (e: any) {

            // Update error state
            this._error = ErrorFactory.fromException(e);
        }
    }

    /*
     * For reliability testing, ask the OAuth agent to make the refresh token act expired, and handle errors
     */
    public async expireRefreshToken(): Promise<void> {

        try {

            // Try the operation
            this._error = null;
            await this._authenticator?.expireRefreshToken();

        } catch (e: any) {

            // Update error state
            this._error = ErrorFactory.fromException(e);
        }
    }

    /*
     * Ask all views to get updated data from the API
     */
    public reloadData(causeError: boolean): void {

        this._error = null;
        this._viewModelCoordinator!.resetState();
        this._eventBus.emit(EventNames.ReloadData, null, new ReloadDataEvent(causeError));
    }

    /*
     * See if there are any errors
     */
    public hasError(): boolean {
        return !!this._error || this._viewModelCoordinator!.hasErrors();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.reloadData = this.reloadData.bind(this);
    }
}
