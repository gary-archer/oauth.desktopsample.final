import React, {useEffect, useState} from 'react';
import Modal from 'react-modal';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {DeepLinkEvent} from '../plumbing/events/deepLinkEvent';
import {EventNames} from '../plumbing/events/eventNames';
import {LoginStartedEvent} from '../plumbing/events/loginStartedEvent';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {CompaniesContainerProps} from '../views/companies/companiesContainerProps';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../views/errors/errorSummaryViewProps';
import {HeaderButtonsView} from '../views/headings/headerButtonsView';
import {HeaderButtonsViewProps} from '../views/headings/headerButtonsViewProps';
import {LoginRequiredViewProps} from '../views/loginRequired/loginRequiredViewProps';
import {SessionView} from '../views/headings/sessionView';
import {SessionViewProps} from '../views/headings/sessionViewProps';
import {TitleView} from '../views/headings/titleView';
import {TitleViewProps} from '../views/headings/titleViewProps';
import {LoginRequiredView} from '../views/loginRequired/loginRequiredView';
import {TransactionsContainer} from '../views/transactions/transactionsContainer';
import {TransactionsContainerProps} from '../views/transactions/transactionsContainerProps';
import {CurrentLocation} from '../views/utilities/currentLocation';
import {LoginNavigator} from '../views/utilities/loginNavigator';
import {AppProps} from './appProps';
import {AppState} from './appState';

/*
 * The application root component
 */
export function App(props: AppProps): JSX.Element {

    // The view is re-rendered when any of these state properties change
    const model = props.viewModel;
    const [state, setState] = useState<AppState>({
        isInitialised: model.isInitialised,
        error: null,
    });

    // Startup runs only once
    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    // Set up React Router navigation
    const navigate = useNavigate();
    const loginNavigator = new LoginNavigator(navigate);

    /*
     * Run the app's startup logic
     */
    async function startup(): Promise<void> {

        // Initialise the modal dialog system used for error popups
        Modal.setAppElement('#root');

        // Subscribe to application events
        model.eventBus.on(EventNames.LoginRequired, onLoginRequired);
        model.eventBus.on(EventNames.DeepLink, onDeepLink);

        // Create global objects
        await initialiseData();
    }

    /*
     * Initialise the model on startup
     */
    async function initialiseData(): Promise<void> {

        // Initialise the view model if required
        await model.initialise();

        // Update state
        setState((s) => {
            return {
                ...s,
                isInitialised: model.isInitialised,
                error: model.error,
            };
        });
    }

    /*
     * Cleanup logic
     */
    function cleanup() {

        // Unsubscribe from application events
        model.eventBus.detach(EventNames.LoginRequired, onLoginRequired);
        model.eventBus.detach(EventNames.DeepLink, onDeepLink);
    }

    /*
     * Redirect to the login required view when we need to sign in
     */
    function onLoginRequired(): void {

        loginNavigator.navigateToLoginRequired();
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    async function onHome(): Promise<void> {

        // Handle retrying failed initialisation
        if (!model.isInitialised) {
            await initialiseData();
        }

        if (model.isInitialised) {

            if (CurrentLocation.path === '/loggedout') {

                // Trigger a login when the Home button is clicked in the Login Required view
                await login();

            } else {

                // Otherwise navigate to the home view
                navigate('/');

                // Force a data reload if recovering from errors
                model.reloadDataOnError();
            }
        }
    }

    /*
     * Navigate to deep links such as x-mycompany-desktopapp:/companies/2
     */
    function onDeepLink(event: DeepLinkEvent): void {

        const prefix = `${props.viewModel.configuration.oauth.privateSchemeName}:`;
        const reactLocation = event.path.replace(prefix, '');
        navigate(reactLocation);
    }

    /*
     * Initiate the login operation
     */
    async function login(): Promise<void> {

        // Update state to indicate a sign in is in progress
        model.eventBus.emit(EventNames.LoginStarted, null, new LoginStartedEvent());

        // Do the work of the login
        await model.login();
        setState((s) => {
            return {
                ...s,
                error: model.error,
            };
        });

        // Move back to the location that took us to login required
        if (!model.error) {
            loginNavigator.restorePreLoginLocation();
        }
    }

    /*
     * Handle logout requests
     */
    async function onLogout(): Promise<void> {

        // Do the logout redirect
        await model.logout();
        setState((s) => {
            return {
                ...s,
                error: model.error,
            };
        });

        // Move to the logged out view upon completion
        navigate('/loggedout');
    }

    /*
     * For test purposes this makes the access token act expired
     */
    async function onExpireAccessToken(): Promise<void> {

        await model.expireAccessToken();
        setState((s) => {
            return {
                ...s,
                error: model.error,
            };
        });
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    async function onExpireRefreshToken(): Promise<void> {

        await model.expireRefreshToken();
        setState((s) => {
            return {
                ...s,
                error: model.error,
            };
        });
    }

    function getTitleProps(): TitleViewProps {

        if (state.isInitialised) {

            return {
                userInfo: {
                    viewModel: model.getUserInfoViewModel(),
                },
            };
        } else {

            return {
                userInfo: null,
            };
        }
    }

    function getHeaderButtonProps(): HeaderButtonsViewProps {

        return {
            eventBus: model.eventBus,
            handleHomeClick: onHome,
            handleExpireAccessTokenClick: onExpireAccessToken,
            handleExpireRefreshTokenClick: onExpireRefreshToken,
            handleReloadDataClick: model.reloadData,
            handleLogoutClick: onLogout,
        };
    }

    function getErrorProps(): ErrorSummaryViewProps {

        return {
            error: state.error!,
            errorsToIgnore: [],
            containingViewName: 'main',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'Application Error',
            centred: true,
        };
    }

    function getSessionProps(): SessionViewProps {

        return {
            sessionId: model.fetchClient.sessionId,
            eventBus: model.eventBus,
        };
    }

    function getCompaniesProps(): CompaniesContainerProps {

        return {
            viewModel: model.getCompaniesViewModel(),
        };
    }

    function getTransactionsProps(): TransactionsContainerProps {

        return {
            viewModel: model.getTransactionsViewModel(),
            navigate,
        };
    }

    function getLoginRequiredProps(): LoginRequiredViewProps {

        return {
            eventBus: model.eventBus,
        };
    }

    return (
        <>
            <TitleView {...getTitleProps()} />
            <HeaderButtonsView {...getHeaderButtonProps()} />
            {state.error && <ErrorSummaryView {...getErrorProps()} />}
            {state.isInitialised &&
                <>
                    <SessionView {...getSessionProps()} />
                    <Routes>
                        <Route path='/'              element={<CompaniesContainer {...getCompaniesProps()} />} />
                        <Route path='/companies/:id' element={<TransactionsContainer {...getTransactionsProps()} />} />
                        <Route path='/loggedout'     element={<LoginRequiredView {...getLoginRequiredProps()} />} />
                        <Route path='*'              element={<CompaniesContainer {...getCompaniesProps()} />} />
                    </Routes>
                </>
            }
        </>
    );
}
