import React from 'react';
import Modal from 'react-modal';
import {HashRouter, Route, Switch} from 'react-router-dom';
import {ApiClient} from '../api/client/apiClient';
import {ConfigurationClient} from '../api/client/configurationClient';
import {Configuration} from '../configuration/configuration';
import {ErrorHandler} from '../plumbing/errors/errorHandler';
import {EventEmitter} from '../plumbing/events/eventEmitter';
import {EventNames} from '../plumbing/events/eventNames';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {CustomSchemeNotifier} from '../plumbing/oauth/customSchemeNotifier';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {ErrorBoundary} from '../views/errors/errorBoundary';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {FooterView} from '../views/frame/footerView';
import {HeadingView} from '../views/frame/headingView';
import {TitleView} from '../views/frame/titleView';
import {HeaderButtonsView} from '../views/headerButtons/headerButtonsView';
import {LoginRequiredView} from '../views/logout/loginRequiredView';
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
            isLoading: true,
            applicationError: null,
            isLoaded: false,
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

        if (this.state.isLoading) {

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
     * Do the initial load before the initial render
     */
    public async componentDidMount(): Promise<void> {

        try {
            // Do the work to load the app
            await this._loadApp();

            // Update the load state to force a rerender of the full view
            this.setState((prevState) => {
                return {...prevState, isLoading: false};
            });

        } catch (e) {
            this.setState((prevState) => {
                return {...prevState, applicationError: ErrorHandler.getFromException(e)};
            });
        }
    }

    /*
     * Attempt to render the entire layout
     */
    private _renderMain(): React.ReactNode {

        const titleProps = {
            userInfo: {
                apiClient: this._apiClient,
                isLoggedOut: this._isLoggedOut(),
                onViewLoaded: this._viewManager.onUserInfoLoaded,
                onViewLoadFailed: this._viewManager.onUserInfoLoadFailed,
            },
        };

        const headerButtonProps = {
            sessionButtonsEnabled: this.state.isLoaded,
            handleHomeClick: this._handleHomeClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
            handleLogoutClick: this._handleLogoutClick,
        };

        const errorProps = {
            hyperlinkMessage: 'Problem Encountered in Application',
            dialogTitle: 'Application Error',
            error: this.state.applicationError,
        };

        const mainViewProps = {
            onViewLoading: this._viewManager.onMainViewLoading,
            onViewLoaded: this._viewManager.onMainViewLoaded,
            onViewLoadFailed: this._viewManager.onMainViewLoadFailed,
            apiClient: this._apiClient,
        };

        const logoutProps = {
            onViewLoading: this._viewManager.onMainViewLoading,
            onViewLoaded: this._viewManager.onMainViewLoaded,
        };

        const footerProps = {
            isVisible: this.state.isLoaded,
        };

        // Callbacks to prevent multi line JSX warnings
        const renderCompaniesView     = () =>             <CompaniesContainer {...mainViewProps} />;
        const renderTransactionsView  = (props: any) =>   <TransactionsContainer {...props} {...mainViewProps} />;
        const renderLoginRequiredView = () =>             <LoginRequiredView {...logoutProps} />;

        // Render the tree view
        return (
            <ErrorBoundary>
                <TitleView {...titleProps} />
                <HeaderButtonsView {...headerButtonProps} />
                <ErrorSummaryView {...errorProps} />
                <HashRouter>
                    <Switch>
                        <Route exact={true} path='/'               render={renderCompaniesView} />
                        <Route exact={true} path='/companies/:id'  render={renderTransactionsView} />
                        <Route exact={true} path='/loginrequired'  render={renderLoginRequiredView} />
                        <Route path='*'                            render={renderCompaniesView} />
                    </Switch>
                </HashRouter>
                <FooterView {...footerProps}/>
            </ErrorBoundary>
        );
    }

    /*
     * Do the initial creation of global objects before attempting to render the whole view
     */
    private async _loadApp(): Promise<void> {

        // First download configuration from the browser's web domain
        const configurationClient = new ConfigurationClient();
        this._configuration = await configurationClient.download('desktop.config.cloudapi.json');

        // Initialise authentication
        this._authenticator = new Authenticator(this._configuration.oauth);
        
        // Initialise listening for login responses
        await CustomSchemeNotifier.initialize();

        // Create a client to reliably call the API
        this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);
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
            sessionButtonsEnabled: this.state.isLoaded,
            handleHomeClick: this._handleHomeClick,
            handleExpireAccessTokenClick: this._handleExpireAccessTokenClick,
            handleRefreshDataClick: this._handleRefreshDataClick,
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
            return {...prevState, isLoaded: loaded};
        });
    }

    /*
     * Ensure we return to the home location and support retries after errors
     */
    private async _handleHomeClick(): Promise<void> {

        location.hash = '#';
        if (this.state.applicationError || this._viewManager.hasError()) {

            // Force a full reload after an error
            location.reload();
        }
    }

    /*
     * For test purposes this makes the access token act expired
     */
    private async _handleExpireAccessTokenClick(): Promise<void> {

        await this._authenticator.expireAccessToken();
    }

    /*
     * Get updated data and re-render when refresh is clicked
     * When refresh is long pressed we will intentionally cause an API 500 error
     */
    private async _handleRefreshDataClick(causeError: boolean): Promise<void> {

        EventEmitter.dispatch(EventNames.reload, causeError);
    }

    /*
     * The view manager notifies the app when a login is required
     */
    private _onLoginRequired(): void {
    }

    /*
     * Do a a simple logout
     */
    private _handleLogoutClick(): void {

        this._authenticator!.logout();
        location.hash = `#loginrequired`;
    }

    /*
     * Calculate whether logged out from the hash URL
     */
    private _isLoggedOut(): boolean {
        return location.hash.indexOf('loginrequired') >= 0;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._onLoadStateChanged = this._onLoadStateChanged.bind(this);
        this._handleHomeClick = this._handleHomeClick.bind(this);
        this._handleExpireAccessTokenClick = this._handleExpireAccessTokenClick.bind(this);
        this._handleRefreshDataClick = this._handleRefreshDataClick.bind(this);
        this._handleLogoutClick = this._handleLogoutClick.bind(this);
    }
}
