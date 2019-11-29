import * as $ from 'jquery';
import {Configuration} from './configuration/configuration';
import {HttpClient} from './plumbing/api/httpClient';
import {Authenticator} from './plumbing/oauth/authenticator';
import {CustomSchemeNotifier} from './plumbing/oauth/customSchemeNotifier';
import {ErrorFragment} from './views/errorFragment';
import {Router} from './views/router';

/*
 * The Electron render process starts with the application class
 */
class App {

    private _authenticator?: Authenticator;
    private _router?: Router;
    private _configuration?: Configuration;

    /*
     * Initialise JQuery and this handling
     */
    public constructor() {
        (window as any).$ = $;
        this._setupCallbacks();
    }

    /*
     * The entry point for the Desktop App
     */
    public async execute(): Promise<void> {

        // Set initial state
        $('.initiallydisabled').prop('disabled', true);

        // Set up click handlers
        $('#btnHome').click(this._onHome);
        $('#btnRefreshData').click(this._onRefreshData);
        $('#btnExpireAccessToken').click(this._onExpireAccessToken);
        $('#btnExpireRefreshToken').click(this._onExpireRefreshToken);
        $('#btnLogout').click(this._onLogout);
        $('#btnClearError').click(this._onClearError);

        // Listen for changes to the UI location
        $(window).on('hashchange', this._onHashChange);

        try {
            // Ensure that the app's URI scheme is registered
            await CustomSchemeNotifier.initialize();

            // Get configuration
            await this._downloadAppConfig();

            // Do one time app initialisation
            await this._initialiseApp();

            // Get claims from our API to display the logged in user
            await this._getUserClaims();

            // Execute the main view at the current hash location
            await this._runPage();

        } catch (e) {

            // Render the error view if there are problems
            this._getErrorView().execute(e);
        }
    }

    /*
     * Get application configuration
     */
    private async _downloadAppConfig(): Promise<void> {
        this._configuration = await HttpClient.loadAppConfiguration('desktop.config.cloudapi.json');
    }

    /*
     * Set up global instances
     */
    private _initialiseApp(): void {
        this._authenticator = new Authenticator(this._configuration!.oauth);
        this._router = new Router(this._configuration!.app, this._authenticator);
    }

     /*
     * Download user claims from the API, which can contain any data we like
     */
    private async _getUserClaims(): Promise<void> {
        await this._router!.executeUserInfoFragment();
    }

    /*
     * Run the current view
     */
    private async _runPage(): Promise<void> {
        await this._router!.executeView();
    }

    /*
     * Change the view based on the hash URL and catch errors
     */
    private async _onHashChange(): Promise<void> {

        try {
            // Try to change view
            await this._router!.executeView();

        } catch (e) {

            // Report failures
            this._getErrorView().execute(e);
        }
    }

    /*
     * Do our basic logout
     */
    private _onLogout(): void {
        this._authenticator!.logout();
        location.hash = `#loginrequired`;
    }

    /*
     * Button handler to reset the hash location to the list view and refresh
     */
    private _onHome(): void {

        if (!this._router) {

            // If we don't have a router yet, reload the whole page
            location.reload();
        } else {

            // Otherwise forward to the router to force a view update
            this._router.moveHome();
        }
    }

    /*
     * Force a page reload
     */
    private async _onRefreshData(): Promise<void> {
        try {
            // Try to reload data
            await this._router!.executeView();

        } catch (e) {

            // Report failures
            this._getErrorView().execute(e);
        }
    }

    /*
     * Force a new access token to be retrieved
     */
    private async _onExpireAccessToken(): Promise<void> {
        await this._authenticator!.expireAccessToken();
    }

    /*
     * Force the next refresh token request to fail
     */
    private async _onExpireRefreshToken(): Promise<void> {
        await this._authenticator!.expireRefreshToken();
    }

    /*
     * Clear error output
     */
    private _onClearError(): void {
        this._getErrorView().clear();
    }

    /*
     * Get the error view
     */
    private _getErrorView(): ErrorFragment {
        return new ErrorFragment();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._onHashChange = this._onHashChange.bind(this);
        this._initialiseApp = this._initialiseApp.bind(this);
        this._getUserClaims = this._getUserClaims.bind(this);
        this._runPage = this._runPage.bind(this);
        this._onLogout = this._onLogout.bind(this);
        this._onHome = this._onHome.bind(this);
        this._onClearError = this._onClearError.bind(this);
        this._onRefreshData = this._onRefreshData.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
   }
}

/*
 * Run the application
 */
const app = new App();
app.execute();
