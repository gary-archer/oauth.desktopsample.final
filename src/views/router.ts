import * as $ from 'jquery';
import * as QueryString from 'query-string';
import {AppConfiguration} from '../configuration/appConfiguration';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {ErrorFragment} from './errorFragment';
import {ListView} from './listView';
import {LoginRequiredView} from './loginRequiredView';
import {TransactionsView} from './transactionsView';
import {UserInfoFragment} from './userInfoFragment';

/*
 * A very primitive router to deal with switching the main view
 */
export class Router {

    /*
     * Dependencies
     */
    private readonly _configuration: AppConfiguration;
    private readonly _authenticator: Authenticator;
    private _currentView: any;
    private _loadingState: boolean;

    /*
     * Receive dependencies
     */
    public constructor(configuration: AppConfiguration, authenticator: Authenticator) {
        this._configuration = configuration;
        this._authenticator = authenticator;
        this._loadingState = false;
    }

    /*
     * Execute a view based on the hash URL data
     */
    public async executeView(): Promise<void> {

        // Switch to the loading state while loading a view
        this._updateControlsDuringLoad();

        // Get the old view
        const oldView = this._currentView;

        // Move to the new view
        const hashData = QueryString.parse(location.hash);
        if ('loginrequired' in hashData) {

            // If the user needs to login then run the login required view
            this._currentView = new LoginRequiredView(this._authenticator, this._configuration);

        } else {

            if (!hashData.company) {

                // Our simple UI shows the the list view by default
                this._currentView = new ListView(
                    this._authenticator,
                    this._configuration.apiBaseUrl);

            } else {

                // Otherwise it tries to render the transactions view for a specific company
                this._currentView = new TransactionsView(
                    this._authenticator,
                    this._configuration.apiBaseUrl,
                    hashData.company);

            }
        }

        // Unload the old view
        if (oldView) {
            oldView.unload();
        }

        // Load the new view
        await this._currentView.execute();

        // Enable buttons unless logged out
        this._updateControlsAfterLoad();

        // After logging in we need to get and display updated user info
        if (oldView instanceof LoginRequiredView)  {
            await this.executeUserInfoFragment();
        }
    }

     /*
     * Show the user info fragment
     */
    public async executeUserInfoFragment(): Promise<void> {

        const view = new UserInfoFragment(this._authenticator, this._configuration.apiBaseUrl);
        await view.execute();
    }

    /*
     * Handle home button clicks, and ensure that we can always retry page loads after errors
     */
    public moveHome(): void {

        // Force the location to always change so that the Home button forces a data refresh
        if (location.hash !== '#home') {
            location.hash = '#home';
        } else {
            location.hash = '#';
        }
    }

    /*
     * Update controls during busy processing and switch to a loading state
     */
    private _updateControlsDuringLoad(): void {

        // Disable buttons while the view loads
        if (!this._loadingState) {
            $('.initiallydisabled').prop('disabled', true);
            this._loadingState = true;
        }

        // Clear errors from the previous view
        const errorView = new ErrorFragment(this._configuration);
        errorView.clear();
    }

    /*
     * Update controls upon completion and remove the loading state
     */
    private _updateControlsAfterLoad(): void {

        // Enable buttons when the view completes
        if (this._loadingState) {
            $('.initiallydisabled').prop('disabled', false);
            this._loadingState = false;
        }
    }
}
