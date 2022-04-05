import React, {useEffect, useState} from 'react';
import Modal from 'react-modal';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {ErrorConsoleReporter} from '../plumbing/errors/errorConsoleReporter';
import {ErrorFactory} from '../plumbing/errors/errorFactory';
import {DeepLinkEvent} from '../plumbing/events/deepLinkEvent';
import {EventNames} from '../plumbing/events/eventNames';
import {LoginStartedEvent} from '../plumbing/events/loginStartedEvent';
import {SetErrorEvent} from '../plumbing/events/setErrorEvent';
import {CompaniesContainer} from '../views/companies/companiesContainer';
import {ErrorBoundary} from '../views/errors/errorBoundary';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {HeaderButtonsView} from '../views/headings/headerButtonsView';
import {SessionView} from '../views/headings/sessionView';
import {TitleView} from '../views/headings/titleView';
import {LoginRequiredView} from '../views/loginRequired/loginRequiredView';
import {TransactionsContainer} from '../views/transactions/transactionsContainer';
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

        try {
            // Initialise the view model if required
            await model.initialise();
            setError(null);

            // Subscribe to application events
            model.eventBus.on(EventNames.LoginRequired, onLoginRequired);
            model.eventBus.on(EventNames.DeepLink, onDeepLink);

            // Update state
            setState((s) => {
                return {
                    ...s,
                    isInitialised: true,
                };
            });

        } catch (e) {
            setError(e);
        }
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

        model.apiViewEvents.clearState();
        loginNavigator.navigateToLoginRequired();
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    async function onHome(): Promise<void> {

        // If there is a startup error then reinitialise the app
        if (!state.isInitialised) {
            cleanup();
            await startup();
        }

        if (state.isInitialised) {

            if (CurrentLocation.path === '/loggedout') {

                // Trigger a login when the Home button is clicked in the Login Required view
                const isLoggedIn = await model.authenticator.isLoggedIn();
                if (!isLoggedIn) {
                    await login();
                    return;
                }
            }

            if (CurrentLocation.path === '/') {

                // Force a reload of the main view if we are already in the home view
                model.reloadMainView();

            } else {

                // Otherwise navigate to the Home View
                navigate('/');
            }
        }
    }

    /*
     * Navigate to deep links when received
     */
    function onDeepLink(event: DeepLinkEvent): void {
        navigate(event.path);
    }

    /*
     * Initiate the login operation
     */
    async function login(): Promise<void> {

        try {

            // Update state to indicate a sign in is in progress
            setError(null);
            model.eventBus.emit(EventNames.LoginStarted, null, new LoginStartedEvent());

            // Do the work of the login
            await model.authenticator.login();

            // Move back to the location that took us to login required
            loginNavigator.restorePreLoginLocation();

            // Reset the re-render flag
            setState((s) => {
                return {
                    ...s,
                    rerender: false,
                };
            });

        } catch (e) {

            // Report login errors
            setError(e);
        }
    }

    /*
     * Handle logout requests
     */
    async function onLogout(): Promise<void> {

        try {
            // Do the logout redirect
            setError(null);
            await model.authenticator.logout();

        } catch (e) {

            // We only output logout errors to the console
            const error = ErrorFactory.fromException(e);
            ErrorConsoleReporter.output(error);

        } finally {

            // Move to the logged out view upon completion
            navigate('/loggedout');
        }
    }

    /*
     * For test purposes this makes the access token act expired
     */
    async function onExpireAccessToken(): Promise<void> {

        try {
            setError(null);
            await model.authenticator.expireAccessToken();

        } catch (e) {
            setError(e);
        }
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    async function onExpireRefreshToken(): Promise<void> {

        try {
            setError(null);
            await model.authenticator.expireRefreshToken();

        } catch (e) {
            setError(e);
        }
    }

    /*
     * A shared subroutine to set error state
     */
    function setError(e: any): void {
        model.eventBus.emit(EventNames.SetError, null, new SetErrorEvent('main', e));
    }

    /*
     * Render basic details before the view model has initialised
     */
    function renderInitialScreen(): JSX.Element {

        const titleProps = {
            userInfo: null,
        };

        const headerButtonProps = {
            eventBus: model.eventBus,
            handleHomeClick: onHome,
            handleExpireAccessTokenClick: onExpireAccessToken,
            handleExpireRefreshTokenClick: onExpireRefreshToken,
            handleReloadDataClick: model.reloadData,
            handleLogoutClick: onLogout,
        };

        const errorBoundaryProps = {
            eventBus: model.eventBus,
        };

        const errorProps = {
            eventBus: model.eventBus,
            containingViewName: 'main',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'Application Error',
            centred: true,
        };

        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <TitleView {...titleProps} />
                <HeaderButtonsView {...headerButtonProps} />
                <ErrorSummaryView {...errorProps} />
            </ErrorBoundary>
        );
    }

    /*
     * Attempt to render the entire layout, which will trigger calls to Web APIs
     */
    function renderMain(): JSX.Element {

        const titleProps = {
            userInfo: {
                viewModel: model.getUserInfoViewModel(),
            },
        };

        const headerButtonProps = {
            eventBus: model.eventBus,
            handleHomeClick: onHome,
            handleExpireAccessTokenClick: onExpireAccessToken,
            handleExpireRefreshTokenClick: onExpireRefreshToken,
            handleReloadDataClick: model.reloadData,
            handleLogoutClick: onLogout,
        };

        const errorBoundaryProps = {
            eventBus: model.eventBus,
        };

        const errorProps = {
            eventBus: model.eventBus,
            containingViewName: 'main',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'Application Error',
            centred: true,
        };

        const sessionProps = {
            sessionId: model.apiClient.sessionId,
            eventBus: model.eventBus,
        };

        const companiesViewProps = {
            viewModel: model.getCompaniesViewModel(),
        };

        const transactionsViewProps = {
            viewModel: model.getTransactionsViewModel(),
            navigate,
        };

        const loginRequiredProps = {
            eventBus: model.eventBus,
        };

        // Render the tree view
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <TitleView {...titleProps} />
                <HeaderButtonsView {...headerButtonProps} />
                <ErrorSummaryView {...errorProps} />
                <SessionView {...sessionProps} />
                <Routes>
                    <Route path='/'              element={<CompaniesContainer {...companiesViewProps} />} />
                    <Route path='/companies/:id' element={<TransactionsContainer {...transactionsViewProps} />} />
                    <Route path='/loggedout'     element={<LoginRequiredView {...loginRequiredProps} />} />
                    <Route path='*'              element={<CompaniesContainer {...companiesViewProps} />} />
                </Routes>
            </ErrorBoundary>
        );
    }

    if (!state.isInitialised) {
        return renderInitialScreen();
    } else {
        return renderMain();
    }
}
