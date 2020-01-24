import React from 'react';
import Modal from 'react-modal';
import {HashRouter, Route, Switch} from 'react-router-dom';
import {ApiClient} from '../api/client/apiClient';
import {Configuration} from '../configuration/configuration';
import {ConfigurationLoader} from '../configuration/configurationLoader';
import {ErrorHandler} from '../plumbing/errors/errorHandler';
import {EventEmitter} from '../plumbing/events/eventEmitter';
import {EventNames} from '../plumbing/events/eventNames';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {CustomSchemeNotifier} from '../plumbing/utilities/customSchemeNotifier';
import {DebugProxyAgent} from '../plumbing/utilities/debugProxyAgent';
import {SslHelper} from '../plumbing/utilities/sslHelper';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {ErrorBoundary} from '../views/errors/errorBoundary';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {HeadingView} from '../views/frame/headingView';
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

        // Track application state
        this.state = {
            isStarting: true,
            isMainViewLoaded: false,
            isLoggedOut: false,
            applicationError: null,
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

            if (this.state.applicationError) {
                return this._renderStartUpError();
            } else {
                return this._renderInitialScreen();
            }

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
            this.setState((prevState) => {
                return {
                    ...prevState,
                    isStarting: true,
                    isMainViewLoaded: false,
                    applicationError: null};
            });

            // Do the work to load the app
            await this._loadApp();

            // Update the load state to force a rerender of the full view
            this.setState((prevState) => {
                return {...prevState, isStarting: false};
            });

        } catch (e) {
            this.setState((prevState) => {
                return {...prevState, applicationError: ErrorHandler.getFromException(e)};
            });
        }
    }

    /*
     * Do the initial creation of global objects before attempting to render the whole view
     */
    private async _loadApp(): Promise<void> {

        // First read configuration
        this._configuration = await ConfigurationLoader.load('desktop.config.json');

        // Set up SSL Trust and HTTP debugging
        await SslHelper.configureTrust();
        DebugProxyAgent.initialize(this._configuration.app.useProxy, this._configuration.app.proxyUrl);

        // Initialise authentication
        this._authenticator = new Authenticator(this._configuration.oauth);

        // Initialise listening for login responses
        await CustomSchemeNotifier.initialize();

        // Create a client to reliably call the API
        this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);
    }

    /*
     * Attempt to render the entire layout
     */
    private _renderMain(): React.ReactNode {

        const titleProps = {
            userInfo: {
                apiClient: this._apiClient,
                isLoggedOut: this.state.isLoggedOut,
                onViewLoaded: this._viewManager.onUserInfoLoaded,
                onViewLoadFailed: this._viewManager.onUserInfoLoadFailed,
            },
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.isMainViewLoaded,
            handleHomeClick: this._handleHomeClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleExpireRefreshTokenClick: this._handleExpireRefreshTokenClick,
            handleLogoutClick: this._handleLogoutClick,
        };

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered in Application',
            dialogTitle: 'Application Error',
            error: this.state.applicationError,
        };

        const sessionProps = {
            isVisible: !(this.state.isMainViewLoaded || this.state.isLoggedOut),
            apiClient: this._apiClient,
        };

        const mainViewProps = {
            onViewLoading: this._viewManager.onMainViewLoading,
            onViewLoaded: this._viewManager.onMainViewLoaded,
            onViewLoadFailed: this._viewManager.onMainViewLoadFailed,
            apiClient: this._apiClient,
        };

        const loginRequiredProps = {
            authenticator: this._authenticator,
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
                <ErrorSummaryView {...errorProps} />
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

        return (
            <ErrorBoundary>
                <TitleView {...titleProps}/>
            </ErrorBoundary>
        );
    }

    /*
     * Render startup errors
     */
    private _renderStartUpError(): React.ReactNode {

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.isMainViewLoaded,
            handleHomeClick: this._handleHomeClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleExpireRefreshTokenClick: this._handleExpireRefreshTokenClick,
            handleLogoutClick: this._handleLogoutClick,
        };

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered during Application Startup',
            dialogTitle: 'Application Startup Error',
            error: this.state.applicationError,
        };

        return (
            <ErrorBoundary>
                <HeadingView />
                <HeaderButtonsView {...headerButtonProps}/>
                <ErrorSummaryView {...errorProps}/>
            </ErrorBoundary>
        );
    }

    /*
     * Update the load state when notified
     */
    private _onLoadStateChanged(loaded: boolean): void {

        this.setState((prevState) => {
            return {...prevState, isMainViewLoaded: loaded};
        });
    }

    /*
     * Ensure we return to the home location and support retries after errors
     */
    private async _handleHomeClick(): Promise<void> {

        // Update the location
        location.hash = '#';

        // Force a full application restart after an error
        if (this.state.applicationError || this._viewManager.hasError()) {
            await this._startApp();
        }
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
     * The view manager coordinartes views and notifies the app when a login is required
     * We then move to the login required view and wait for the system browser login response
     */
    private _onLoginRequired(): void {

        this.setState((prevState) => {
            return {...prevState, isLoggedOut: true, isMainViewLoaded: false};
        });

        LoginRequiredView.navigate();
    }

    /*
     * Update state when a login completes
     */
    private _onLoginCompleted(): void {

        this.setState((prevState) => {
            return {...prevState, isLoggedOut: false};
        });
    }

    /*
     * Initiate logout processing
     */
    private async _handleLogoutClick(): Promise<void> {

        // Do the logout
        await this._authenticator!.startLogout();

        // Update state to indicate that we are logged out
        this.setState((prevState) => {
            return {...prevState, isLoggedOut: true, isMainViewLoaded: false};
        });

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
        this._handleLogoutClick = this._handleLogoutClick.bind(this);
    }
}
