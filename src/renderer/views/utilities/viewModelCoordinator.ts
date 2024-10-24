import EventBus from 'js-event-bus';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {UIError} from '../../../shared/errors/uiError';
import {FetchCache} from '../../api/fetchCache';
import {FetchCacheKeys} from '../../api/fetchCacheKeys';
import {AuthenticatorClient} from '../../oauth/authenticatorClient';
import {LoginRequiredEvent} from '../events/loginRequiredEvent';
import {UIEventNames} from '../events/uiEventNames';
import {ViewModelFetchEvent} from '../events/viewModelFetchEvent';

/*
 * Coordinates API requests from multiple views, and notifies once all API calls are complete
 * This ensures that login redirects are only triggered once
 */
export class ViewModelCoordinator {

    private readonly eventBus: EventBus;
    private readonly fetchCache: FetchCache;
    private readonly authenticatorClient: AuthenticatorClient;
    private mainCacheKey: string;
    private loadingCount: number;
    private loadedCount: number;

    /*
     * Set the initial state
     */
    public constructor(eventBus: EventBus, fetchCache: FetchCache, authenticatorClient: AuthenticatorClient) {

        this.eventBus = eventBus;
        this.fetchCache = fetchCache;
        this.authenticatorClient = authenticatorClient;
        this.mainCacheKey = '';
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.setupCallbacks();
    }

    /*
     * This is called when the companies or transactions view model start sending API requests
     */
    public onMainViewModelLoading(): void {

        // Update stats
        ++this.loadingCount;

        // Send an event so that a subscriber can show a UI effect, such as disabling header buttons
        this.eventBus.emit(UIEventNames.ViewModelFetch, null, new ViewModelFetchEvent(false));
    }

    /*
     * This is called when the companies or transactions view model finish sending API requests
     */
    public async onMainViewModelLoaded(cacheKey: string): Promise<void> {

        // Increase stats
        this.mainCacheKey = cacheKey;
        ++this.loadedCount;

        // On success, send an event so that a subscriber can show a UI effect such as enabling header buttons
        const found = this.fetchCache.getItem(cacheKey);
        if (found?.getData()) {
            this.eventBus.emit(UIEventNames.ViewModelFetch, null, new ViewModelFetchEvent(true));
        }

        // Perform error logic after all views have loaded
        await this.handleErrorsAfterLoad();
    }

    /*
     * This is called when the userinfo view model starts sending API requests
     */
    public onUserInfoViewModelLoading(): void {
        ++this.loadingCount;
    }

    /*
     * This is called when the userinfo view model finishes sending API requests
     */
    public async onUserInfoViewModelLoaded(): Promise<void> {
        ++this.loadedCount;
        await this.handleErrorsAfterLoad();
    }

    /*
     * Return true if there were any load errors
     */
    public hasErrors(): boolean {
        return this.getLoadErrors().length > 0;
    }

    /*
     * Reset state when the Reload Data button is clicked
     */
    public resetState(): void {
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.mainCacheKey = '';
        this.fetchCache.clearAll();
    }

    /*
     * Handle OAuth related errors
     */
    private async handleErrorsAfterLoad(): Promise<void> {

        if (this.loadedCount === this.loadingCount) {

            const errors = this.getLoadErrors();

            // Login required errors occur when there are no tokens yet or when token refresh fails
            // The sample's user behavior is to automatically redirect the user to login
            const loginRequired = errors.find((e) => e.getErrorCode() === ErrorCodes.loginRequired);
            if (loginRequired) {
                this.resetState();
                this.eventBus.emit(UIEventNames.LoginRequired, new LoginRequiredEvent());
                return;
            }

            // In normal conditions the following errors are likely to be OAuth configuration errors
            const oauthConfigurationError = errors.find((e) =>
                (e.getStatusCode() === 401 && e.getErrorCode() === ErrorCodes.invalidToken) ||
                (e.getStatusCode() === 403 && e.getErrorCode() === ErrorCodes.insufficientScope));

            // The sample's user behavior is to present an error, after which clicking Home runs a new login redirect
            // This allows the frontend application to get new tokens, which may fix the problem in some cases
            if (oauthConfigurationError) {
                await this.authenticatorClient.clearLoginState();
            }
        }
    }

    /*
     * Get the result of loading all views
     */
    private getLoadErrors(): UIError[] {

        const keys: string[] = [];
        const errors: UIError[] = [];

        if (this.mainCacheKey) {
            keys.push(this.mainCacheKey);
        }
        keys.push(FetchCacheKeys.OAuthUserInfo);
        keys.push(FetchCacheKeys.ApiUserInfo);

        keys.forEach((k) => {

            const found = this.fetchCache.getItem(k);
            const error = found?.getError();
            if (error) {
                errors.push(error);
            }
        });

        return errors;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks(): void {
        this.onMainViewModelLoading = this.onMainViewModelLoading.bind(this);
        this.onMainViewModelLoaded = this.onMainViewModelLoaded.bind(this);
        this.onUserInfoViewModelLoading = this.onUserInfoViewModelLoading.bind(this);
        this.onUserInfoViewModelLoaded = this.onUserInfoViewModelLoaded.bind(this);
    }
}
