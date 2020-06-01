import React from 'react';
import Modal from 'react-modal';
import {HashRouter, Route, Switch} from 'react-router-dom';
import {ApiClient} from '../api/client/apiClient';
import {Configuration} from '../configuration/configuration';
import {ErrorConsoleReporter} from '../plumbing/errors/errorConsoleReporter';
import {ErrorHandler} from '../plumbing/errors/errorHandler';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {ApplicationEvents} from '../plumbing/events/applicationEvents';
import {PrivateUriSchemeNotifier} from '../plumbing/events/privateUriSchemeNotifier';
import {RendererEvents} from '../plumbing/events/rendererEvents';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {AuthenticatorImpl} from '../plumbing/oauth/authenticatorImpl';
import {LoginNavigation} from '../plumbing/oauth/login/loginNavigation';
import {HttpProxy} from '../plumbing/utilities/httpProxy';
import {SslHelper} from '../plumbing/utilities/sslHelper';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {ErrorBoundary} from '../views/errors/errorBoundary';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {HeaderButtonsView} from '../views/headings/headerButtonsView';
import {SessionView} from '../views/headings/sessionView';
import {TitleView} from '../views/headings/titleView';
import {LoginRequiredView} from '../views/loginRequired/loginRequiredView';
import {TransactionsContainer} from '../views/transactions/transactionsContainer';
import {ViewManager} from '../views/viewManager';
import {AppState} from './appState';

/*
 * The application root component
 */
export class App extends React.Component<any, AppState> {

    private _viewManager: ViewManager;
    private _events: RendererEvents;
    private _configuration?: Configuration;
    private _authenticator?: Authenticator;
    private _apiClient?: ApiClient;
    private _privateUriSchemeNotifier?: PrivateUriSchemeNotifier;

    /*
     * Create safe objects here and do async startup processing later
     */
    public constructor(props: any) {
        super(props);

        // Set initial state, which will be used on the first render
        this.state = {
            isInitialised: false,
            isDataLoaded: false,
            error: null,
        };

        // Make callbacks available
        this._setupCallbacks();

        // Create a helper class to coordinate multiple views that get data together
        this._viewManager = new ViewManager(this._onLoginRequired, this._onLoadStateChanged);
        this._viewManager.setViewCount(2);

        // Create a class to manage sending events to the main side of the app
        this._events = new RendererEvents();

        // Initialise the modal dialog system used for error popups
        Modal.setAppElement('#root');
    }

    /*
     * The rendering entry point
     */
    public render(): React.ReactNode {

        if (!this.state.isInitialised) {
            return this._renderInitialScreen();
        } else {
            return this._renderMain();
        }
    }

    /*
     * Do the initial load when the application starts up
     */
    public async componentDidMount(): Promise<void> {
        await this._initialiseApp();
    }

    /*
     * Application startup code
     */
    private async _initialiseApp(): Promise<void> {

        try {

            // Reset state during load
            this.setState({
                isInitialised: false,
                isDataLoaded: false,
                error: null,
            });

            // First load configuration
            this._configuration = await this._events.loadConfiguration();

            // Set up SSL Trust and HTTP debugging
            await SslHelper.configureTrust();
            HttpProxy.initialize(
                this._configuration.app.useProxy,
                this._configuration.app.proxyHost,
                this._configuration.app.proxyPort);

            // Initialise private uri scheme handling
            this._privateUriSchemeNotifier = new PrivateUriSchemeNotifier(this._configuration.oauth.logoutCallbackPath);
            await this._privateUriSchemeNotifier.setDeepLinkStartupUrlIfRequired();

            // Initialise authentication
            this._authenticator = new AuthenticatorImpl(
                this._configuration.oauth,
                this._events,
                this._privateUriSchemeNotifier);
            await this._authenticator.initialise();

            // Create a client to call the API and handle retries
            this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);

            // Update state
            this.setState({
                isInitialised: true,
            });

        } catch (e) {
            this.setState({error: ErrorHandler.getFromException(e)});
        }
    }

    /*
     * Render basic details before the app has initialised
     */
    private _renderInitialScreen(): React.ReactNode {

        const titleProps = {
            userInfo: null,
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.isDataLoaded,
            handleHomeClick: this._onHome,
            handleReloadDataClick: this._onReloadData,
            handleExpireAccessTokenClick: this._onExpireAccessToken,
            handleExpireRefreshTokenClick: this._onExpireRefreshToken,
            handleLogoutClick: this._onLogout,
        };

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'Startup Error',
            error: this.state.error,
            centred: true,
        };

        return (
            <ErrorBoundary>
                <TitleView {...titleProps} />
                <HeaderButtonsView {...headerButtonProps} />
                <ErrorSummaryView {...errorProps} />
            </ErrorBoundary>
        );
    }

    /*
     * Attempt to render the entire layout after initialisation
     */
    private _renderMain(): React.ReactNode {

        const titleProps = {
            userInfo: {
                apiClient: this._apiClient!,
                viewManager: this._viewManager!,
                shouldLoad: !this._isInLoginRequired(),
            },
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.isDataLoaded,
            handleHomeClick: this._onHome,
            handleReloadDataClick: this._onReloadData,
            handleExpireAccessTokenClick: this._onExpireAccessToken,
            handleExpireRefreshTokenClick: this._onExpireRefreshToken,
            handleLogoutClick: this._onLogout,
        };

        const sessionProps = {
            apiClient: this._apiClient!,
            isVisible: this._authenticator!.isLoggedIn(),
        };

        const mainViewProps = {
            apiClient: this._apiClient!,
            viewManager: this._viewManager,
        };

        const loginRequiredProps = {
            authenticator: this._authenticator!,
            onLoginCompleted: this._onLoginCompleted,
        };

        // Callbacks to prevent multi line JSX warnings
        const renderCompaniesView     = () =>             <CompaniesContainer {...mainViewProps} />;
        const renderTransactionsView  = (props: any) =>   <TransactionsContainer {...props} {...mainViewProps} />;
        const renderLoginRequiredView = () =>             <LoginRequiredView {...loginRequiredProps} />;

        // Render the tree view
        return (
            <ErrorBoundary>
                <TitleView {...titleProps} />
                <HeaderButtonsView {...headerButtonProps} />
                <SessionView {...sessionProps} />
                <HashRouter>
                    <Switch>
                        <Route exact={true} path='/'               render={renderCompaniesView} />
                        <Route exact={true} path='/company=:id'    render={renderTransactionsView} />
                        <Route exact={true} path='/loginrequired*' render={renderLoginRequiredView} />
                        <Route path='*'                            render={renderCompaniesView} />
                    </Switch>
                </HashRouter>
            </ErrorBoundary>
        );
    }

    /*
     * Update the load state when notified
     */
    private _onLoadStateChanged(loaded: boolean): void {
        this.setState({isDataLoaded: loaded});
    }

    /*
     * Get updated data and re-render when refresh is clicked
     * When refresh is long pressed we will intentionally cause an API 500 error
     */
    private _onReloadData(causeError: boolean): void {

        this._viewManager.setViewCount(2);
        ApplicationEvents.publish(ApplicationEventNames.ON_RELOAD, causeError);
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    private async _onHome(): Promise<void> {

        // If there is a startup error then reinitialise the app
        if (!this.state.isInitialised) {
            await this._initialiseApp();
            return;
        }

        // When in the login required view and home is clicked, force a login redirect
        const isLoggedIn = await this._authenticator!.isLoggedIn();
        if (!isLoggedIn) {
            ApplicationEvents.publish(ApplicationEventNames.ON_LOGIN, {});
            return;
        }

        // Force views to reload if there have been view errors
        if (!this.state.isDataLoaded) {
            this._onReloadData(false);
        }

        // Navigate to the home view
        location.hash = '#';
    }

    /*
     * The view manager coordinates views and notifies the app when a login is required
     * We then move to the login required view and wait for the system browser login response
     */
    private _onLoginRequired(): void {

        LoginNavigation.navigateToLoginRequired();
        this.setState({isDataLoaded: false});
    }

    /*
     * The login required view uses the authenticator to do the login and calls this on completion
     * Update state and restore the hash location when a login completes
     */
    private _onLoginCompleted(): void {

        LoginNavigation.restorePreLoginLocation();
        this.setState({isDataLoaded: true});
    }

    /*
     * Handle logout requests
     */
    private async _onLogout(): Promise<void> {

        try {
            // Do the logout redirect
            await this._authenticator!.logout();

        } catch (e) {

            // We only output logout errors to the console
            const error = ErrorHandler.getFromException(e);
            ErrorConsoleReporter.output(error);

        } finally {

            // Move to login required upon completion
            location.hash = '#/loginrequired';

            // Reset state
            this.setState({isDataLoaded: false});
        }
    }

    /*
     * Return true if our location is the login required view
     */
    private _isInLoginRequired(): boolean {
        return location.hash.indexOf('loginrequired') !== -1;
    }

    /*
     * For test purposes this makes the access token act expired
     */
    private async _onExpireAccessToken(): Promise<void> {
        await this._authenticator!.expireAccessToken();
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    private async _onExpireRefreshToken(): Promise<void> {
        await this._authenticator!.expireRefreshToken();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._onLoginRequired = this._onLoginRequired.bind(this);
        this._onLoginCompleted = this._onLoginCompleted.bind(this);
        this._onLoadStateChanged = this._onLoadStateChanged.bind(this);
        this._onHome = this._onHome.bind(this);
        this._onLogout = this._onLogout.bind(this);
        this._onReloadData = this._onReloadData.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
    }
}
