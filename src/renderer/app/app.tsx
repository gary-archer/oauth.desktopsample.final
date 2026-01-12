import {JSX, useEffect, useState} from 'react';
import Modal from 'react-modal';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {CompaniesView} from '../views/companies/companiesView';
import {CompaniesViewProps} from '../views/companies/companiesViewProps';
import {ErrorSummaryView} from '../views/errors/errorSummaryView';
import {ErrorSummaryViewProps} from '../views/errors/errorSummaryViewProps';
import {DeepLinkEvent} from '../views/events/deepLinkEvent';
import {LoginStartedEvent} from '../views/events/loginStartedEvent';
import {UIEventNames} from '../views/events/uiEventNames';
import {HeaderButtonsView} from '../views/headings/headerButtonsView';
import {HeaderButtonsViewProps} from '../views/headings/headerButtonsViewProps';
import {LoginRequiredViewProps} from '../views/loginRequired/loginRequiredViewProps';
import {SessionView} from '../views/headings/sessionView';
import {SessionViewProps} from '../views/headings/sessionViewProps';
import {TitleView} from '../views/headings/titleView';
import {TitleViewProps} from '../views/headings/titleViewProps';
import {LoginRequiredView} from '../views/loginRequired/loginRequiredView';
import {TransactionsView} from '../views/transactions/transactionsView';
import {TransactionsViewProps} from '../views/transactions/transactionsViewProps';
import {CurrentLocation} from '../views/utilities/currentLocation';
import {AppProps} from './appProps';

/*
 * The application shell component
 */
export function App(props: AppProps): JSX.Element {

    // Initialize React state from the view model
    const model = props.viewModel;
    const [sessionId, setSessionId] = useState(model.getSessionId());
    const [error, setError] = useState(model.getError());

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
        model.getEventBus().on(UIEventNames.LoginRequired, onLoginRequired);
        model.getEventBus().on(UIEventNames.DeepLink, onDeepLink);

        // Initialise the model
        await model.initialise();
        setSessionId(model.getSessionId());
        setError(model.getError());
    }

    /*
     * Cleanup logic
     */
    function cleanup() {

        // Unsubscribe from application events
        model.getEventBus().detach(UIEventNames.LoginRequired, onLoginRequired);
        model.getEventBus().detach(UIEventNames.DeepLink, onDeepLink);
    }

    /*
     * Redirect to the login required view when w7e need to sign in
     */
    function onLoginRequired(): void {
        navigate('/loggedout');
    }

    /*
     * The home button renders 'Sign In' when the user is not logged in
     */
    async function onHome(): Promise<void> {

        if (!model.getOAuthClient().isLoggedIn()) {

            // Update state to indicate a login is in progress
            model.getEventBus().emit(UIEventNames.LoginStarted, null, new LoginStartedEvent());

            // Do the work of the login
            await model.login();
            setSessionId(model.getSessionId());
            setError(model.getError());

            // Move back to the location that took us to login required
            if (!model.getError()) {
                navigate(CurrentLocation.path);
            }

        } else {

            // Otherwise navigate to the home view
            navigate('/');

            // Force a data reload if recovering from errors
            if (model.hasApiError()) {
                model.triggerDataReload(false);
            }
        }
    }

    /*
     * Navigate to deep links such as x-authsamples-desktopapp:/companies/2
     */
    function onDeepLink(event: DeepLinkEvent): void {
        navigate(event.getPath());
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
        setSessionId(model.getSessionId());
        setError(model.getError());
    }

    /*
     * For test purposes this makes the access token act expired
     */
    async function onExpireAccessToken(): Promise<void> {
        await model.expireAccessToken();
        setError(model.getError());
    }

    /*
     * For test purposes this makes the refresh token act expired
     */
    async function onExpireRefreshToken(): Promise<void> {
        await model.expireRefreshToken();
        setError(model.getError());
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
            eventBus: model.getEventBus(),
            handleHomeClick: onHome,
            handleExpireAccessTokenClick: onExpireAccessToken,
            handleExpireRefreshTokenClick: onExpireRefreshToken,
            handleReloadDataClick: model.triggerDataReload,
            handleLogoutClick: onLogout,
        };
    }

    function getErrorProps(): ErrorSummaryViewProps {

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return {
            error: error!,
            errorsToIgnore: [ErrorCodes.loginCancelled],
            containingViewName: 'main',
            hyperlinkMessage: 'Problem Encountered',
            dialogTitle: 'Application Error',
            centred: true,
        };
    }

    function getSessionProps(): SessionViewProps {

        return {
            sessionId: sessionId,
            eventBus: model.getEventBus(),
        };
    }

    function getCompaniesProps(): CompaniesViewProps {

        return {
            viewModel: model.getCompaniesViewModel(),
        };
    }

    function getTransactionsProps(): TransactionsViewProps {

        return {
            viewModel: model.getTransactionsViewModel(),
            navigate,
        };
    }

    function getLoginRequiredProps(): LoginRequiredViewProps {

        return {
            eventBus: model.getEventBus(),
        };
    }

    return (
        <>
            <TitleView {...getTitleProps()} />
            <HeaderButtonsView {...getHeaderButtonProps()} />
            {error && <ErrorSummaryView {...getErrorProps()} />}
            <>
                <SessionView {...getSessionProps()} />
                <Routes>
                    <Route path='/'              element={<CompaniesView {...getCompaniesProps()} />} />
                    <Route path='/companies/:id' element={<TransactionsView {...getTransactionsProps()} />} />
                    <Route path='/loggedout'     element={<LoginRequiredView {...getLoginRequiredProps()} />} />
                    <Route path='*'              element={<CompaniesView {...getCompaniesProps()} />} />
                </Routes>
            </>
        </>
    );
}
