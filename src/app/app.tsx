import React, {useEffect} from 'react';
import Modal from 'react-modal';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {DeepLinkEvent} from '../plumbing/events/deepLinkEvent';
import {LoginStartedEvent} from '../plumbing/events/loginStartedEvent';
import {UIEventNames} from '../plumbing/events/uiEventNames';
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
import {AppProps} from './appProps';

/*
 * The application shell component
 */
export function App(props: AppProps): JSX.Element {

    const model = props.viewModel;
    model.useState();
    const navigate = useNavigate();

    useEffect(() => {
        startup();
        return () => cleanup();
    }, []);

    /*
     * Run the app's startup logic
     */
    async function startup(): Promise<void> {

        // Initialise the modal dialog system used for error popups
        Modal.setAppElement('#root');

        // Subscribe to application events
        model.eventBus.on(UIEventNames.LoginRequired, onLoginRequired);
        model.eventBus.on(UIEventNames.DeepLink, onDeepLink);

        // Initialise the model
        await model.initialise();
    }

    /*
     * Cleanup logic
     */
    function cleanup() {

        // Unsubscribe from application events
        model.eventBus.detach(UIEventNames.LoginRequired, onLoginRequired);
        model.eventBus.detach(UIEventNames.DeepLink, onDeepLink);
    }

    /*
     * Redirect to the login required view when we need to sign in
     */
    function onLoginRequired(): void {
        navigate('/loggedout');
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    async function onHome(): Promise<void> {

        const isLoggedIn = await model.authenticatorClient.isLoggedIn();
        if (!isLoggedIn) {

            // Update state to indicate a login is in progress
            model.eventBus.emit(UIEventNames.LoginStarted, null, new LoginStartedEvent());

            // Do the work of the login
            await model.login();

            // Move back to the location that took us to login required
            if (!model.error) {
                navigate(CurrentLocation.path);
            }

        } else {

            // Otherwise navigate to the home view
            navigate('/');

            // Force a data reload if recovering from errors
            if (model.hasError()) {
                model.reloadData(false);
            }
        }
    }

    /*
     * Handle reloads and updating the error state
     */
    function onReloadData(causeError: boolean): void {
        model.reloadData(causeError);
    }

    /*
     * Navigate to deep links such as x-authsamples-desktopapp:/companies/2
     */
    function onDeepLink(event: DeepLinkEvent): void {
        navigate(event.path);
    }

    /*
     * Handle logout requests
     */
    async function onLogout(): Promise<void> {

        // Move the desktop app to the logged out view and reset its path
        CurrentLocation.path = '/';
        navigate('/loggedout');

        // Do the logout redirect to remove the SSO cookie
        await model.logout();
    }

    /*
     * For test purposes this makes the access token act expired
     */
    async function onExpireAccessToken(): Promise<void> {
        await model.expireAccessToken();
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    async function onExpireRefreshToken(): Promise<void> {
        await model.expireRefreshToken();
    }

    function getTitleProps(): TitleViewProps {

        return {
            userInfo: {
                viewModel: model.getUserInfoViewModel(),
            },
        };
    }

    function getHeaderButtonProps(): HeaderButtonsViewProps {

        return {
            eventBus: model.eventBus,
            handleHomeClick: onHome,
            handleExpireAccessTokenClick: onExpireAccessToken,
            handleExpireRefreshTokenClick: onExpireRefreshToken,
            handleReloadDataClick: onReloadData,
            handleLogoutClick: onLogout,
        };
    }

    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: model.error!,
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
            {model.error && <ErrorSummaryView {...getErrorProps()} />}
            <>
                <SessionView {...getSessionProps()} />
                <Routes>
                    <Route path='/'              element={<CompaniesContainer {...getCompaniesProps()} />} />
                    <Route path='/companies/:id' element={<TransactionsContainer {...getTransactionsProps()} />} />
                    <Route path='/loggedout'     element={<LoginRequiredView {...getLoginRequiredProps()} />} />
                    <Route path='*'              element={<CompaniesContainer {...getCompaniesProps()} />} />
                </Routes>
            </>
        </>
    );
}
