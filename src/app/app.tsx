import React from 'react';
import Modal from 'react-modal';
import {HashRouter, Route, Switch} from 'react-router-dom';
import {ApiClient} from '../api/client/apiClient';
import {Configuration} from '../configuration/configuration';
import {ConfigurationLoader} from '../configuration/configurationLoader';
import {UIError} from '../plumbing/errors/uiError';
import {EventEmitter} from '../plumbing/events/eventEmitter';
import {EventNames} from '../plumbing/events/eventNames';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {AuthenticatorImpl} from '../plumbing/oauth/authenticatorImpl';
import {CustomSchemeNotifier} from '../plumbing/utilities/customSchemeNotifier';
import {DebugProxyAgent} from '../plumbing/utilities/debugProxyAgent';
import {ExpiryNavigation} from '../plumbing/utilities/expiryNavigation';
import {SslHelper} from '../plumbing/utilities/sslHelper';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {AppErrorView} from '../views/errors/appErrorView';
import {ErrorBoundary} from '../views/errors/errorBoundary';
import {SessionView} from '../views/frame/sessionView';
import {TitleView} from '../views/frame/titleView';
import {HeaderButtonsView} from '../views/headerButtons/headerButtonsView';
import {LoginRequiredView} from '../views/loginRequired/loginRequiredView';
import {TransactionsContainer} from '../views/transactions/transactionsContainer';
import {ViewManager} from '../views/viewManager';
import {AppState} from './appState';

/*
 * The application root component
 */
export class App extends React.Component<any, AppState> {

    private _viewManager: ViewManager;
    private _configuration!: Configuration;
    private _authenticator!: Authenticator;
    private _apiClient!: ApiClient;

    public constructor(props: any) {
        super(props);

        // Set initial state, which will be used on the first render
        this.state = {
            isStarting: true,
            isLoggedIn: false,
            loadUserInfo: true,
            sessionButtonsEnabled: false,
        };

        // Make callbacks available
        this._setupCallbacks();

        // Create a helper class to do multiple view coordination and initialise the modal dialog
        this._viewManager = new ViewManager(this._onLoginRequired, this._onLoadStateChanged);
        Modal.setAppElement('#root');
    }

    /*
     * The rendering entry point
     */
    public render(): React.ReactNode {

        if (this.state.isStarting) {
            return this._renderInitialScreen();
        } else {
            return this._renderMain();
        }
    }

    /*
     * Do the initial load when the application starts up
     */
    public async componentDidMount(): Promise<void> {

        await this._startApp();
    }

    /*
     * Application startup code
     */
    private async _startApp(): Promise<void> {

        try {

            // Reset state during load
            this.setState({
                isStarting: true,
                isLoggedIn: false,
                loadUserInfo: true,
                sessionButtonsEnabled: false,
            });

            // First read configuration
            this._configuration = await ConfigurationLoader.load('desktop.config.json');

            // Set up SSL Trust and HTTP debugging
            await SslHelper.configureTrust();
            DebugProxyAgent.initialize(this._configuration.app.useProxy, this._configuration.app.proxyUrl);

            // Initialise authentication
            this._authenticator = new AuthenticatorImpl(this._configuration.oauth);

            // Initialise listening for login responses
            await CustomSchemeNotifier.initialize();

            // Create a client to reliably call the API
            this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);

            // If there are stored tokens, the initial state is logged in
            const isLoggedIn = await this._authenticator.isLoggedIn();

            // Update the UI state
            this.setState({
                isStarting: false,
                isLoggedIn,
                sessionButtonsEnabled: isLoggedIn,
            });

        } catch (e) {
            EventEmitter.dispatch(EventNames.error, {area: 'Startup', error: e});
        }
    }

    /*
     * Attempt to render the entire layout
     */
    private _renderMain(): React.ReactNode {

        const titleProps = {
            userInfo: {
                apiClient: this._apiClient,
                initialShouldLoad: this.state.loadUserInfo,
                onViewLoaded: this._viewManager.onUserInfoLoaded,
                onViewLoadFailed: this._viewManager.onUserInfoLoadFailed,
            },
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.sessionButtonsEnabled,
            handleHomeClick: this._handleHomeClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleExpireRefreshTokenClick: this._handleExpireRefreshTokenClick,
            handleLogoutClick: this._handleLogoutClick,
        };

        const sessionProps = {
            isVisible: this.state.isLoggedIn,
            apiClient: this._apiClient,
        };

        const mainViewProps = {
            onViewLoading: this._viewManager.onMainViewLoading,
            onViewLoaded: this._viewManager.onMainViewLoaded,
            onViewLoadFailed: this._viewManager.onMainViewLoadFailed,
            apiClient: this._apiClient,
        };

        const loginRequiredProps = {
            onLoginRedirect: this._onLoginRedirect,
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
                <AppErrorView />
                <SessionView {...sessionProps}/>
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
     * Render basic details before the app has initialised
     */
    private _renderInitialScreen(): React.ReactNode {

        const titleProps = {
            userInfo: null,
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.sessionButtonsEnabled,
            handleHomeClick: this._handleHomeClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleExpireRefreshTokenClick: this._handleExpireRefreshTokenClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
            handleLogoutClick: this._handleLogoutClick,
        };

        return (
            <ErrorBoundary>
                <TitleView {...titleProps}/>
                <HeaderButtonsView {...headerButtonProps}/>
                <AppErrorView />
            </ErrorBoundary>
        );
    }

    /*
     * Update the load state when notified
     */
    private _onLoadStateChanged(loaded: boolean): void {

        this.setState({sessionButtonsEnabled: loaded});
    }

    /*
     * Return to the home location and also support retries after errors
     */
    private async _handleHomeClick(): Promise<void> {

        // When logged out and home is clicked, force a login redirect and return home
        if (!this.state.isLoggedIn) {
            await this._onLoginRedirect();
            return;
        }

        // Force a full app reload after an error to ensure that all data is retried
        if (this.state.isStarting || this._viewManager.hasError()) {
            await this._startApp();
        }

        // Navigate home
        location.hash = '#';
    }

    /*
     * For test purposes this makes the access token act expired
     */
    private async _handleExpireAccessTokenClick(): Promise<void> {

        await this._authenticator.expireAccessToken();
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    private async _handleExpireRefreshTokenClick(): Promise<void> {

        await this._authenticator.expireRefreshToken();
    }

    /*
     * Get updated data and re-render when refresh is clicked
     * When refresh is long pressed we will intentionally cause an API 500 error
     */
    private async _handleRefreshDataClick(causeError: boolean): Promise<void> {

        EventEmitter.dispatch(EventNames.reload, causeError);
    }

    /*
     * The view manager coordinates views and notifies the app when a login is required
     * We then move to the login required view and wait for the system browser login response
     */
    private _onLoginRequired(): void {

        this.setState({isLoggedIn: false, sessionButtonsEnabled: false});
        ExpiryNavigation.navigateToLoginRequired();
    }

    /*
     * The login required view calls us back to begin the login process
     */
    private async _onLoginRedirect(): Promise<void> {

        try {
            await this._authenticator!.startLogin(this._onLoginCompleted);

        } catch (e) {
            EventEmitter.dispatch(EventNames.error, {area: 'Login', error: e});
        }
    }

    /*
     * Update state when a login completes
     */
    private _onLoginCompleted(): void {

        // Update state
        this.setState({isLoggedIn: true, loadUserInfo: true, sessionButtonsEnabled: true});

        // Restore the hash location
        ExpiryNavigation.restorePreLoginLocation();
    }

    /*
     * Trigger the logout redirect on the system browser
     */
    private async _handleLogoutClick(): Promise<void> {

        try {
            await this._authenticator!.startLogout(this._onLogoutCompleted);

        } catch (e) {
            EventEmitter.dispatch(EventNames.error, {area: 'Logout', error: e});
        }
    }

    /*
     * Complete logout processing
     */
    private _onLogoutCompleted(e: UIError | null): void {

        // Update state to indicate that we are logged out
        this.setState({isLoggedIn: false, loadUserInfo: false, sessionButtonsEnabled: false});

        // Move to the login required page
        location.hash = `#/loginrequired`;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._onLoadStateChanged = this._onLoadStateChanged.bind(this);
        this._handleHomeClick = this._handleHomeClick.bind(this);
        this._handleRefreshDataClick = this._handleRefreshDataClick.bind(this);
        this._handleExpireAccessTokenClick = this._handleExpireAccessTokenClick.bind(this);
        this._handleExpireRefreshTokenClick = this._handleExpireRefreshTokenClick.bind(this);
        this._onLoginCompleted = this._onLoginCompleted.bind(this);
        this._onLoginRequired = this._onLoginRequired.bind(this);
        this._onLoginRedirect = this._onLoginRedirect.bind(this);
        this._onLogoutCompleted = this._onLogoutCompleted.bind(this);
        this._handleLogoutClick = this._handleLogoutClick.bind(this);
    }
}
