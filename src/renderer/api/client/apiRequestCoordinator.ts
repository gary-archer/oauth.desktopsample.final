import EventBus from 'js-event-bus';
import {ErrorCodes} from '../../../shared/errors/errorCodes';
import {UIError} from '../../../shared/errors/uiError';
import {FetchCache} from '../cache/fetchCache';
import {ApiRequestEvent} from '../../views/events/apiRequestEvent';
import {LoginRequiredEvent} from '../../views/events/loginRequiredEvent';
import {UIEventNames} from '../../views/events/uiEventNames';

/*
 * Coordinates API requests from multiple views, and handles session expiry when required
 */
export class ApiRequestCoordinator {

    private readonly fetchCache: FetchCache;
    private readonly eventBus: EventBus;
    private cacheKeys: string[];
    private loadingCount: number;
    private loadedCount: number;
    private errors: UIError[];

    /*
     * Set the initial state
     */
    public constructor(fetchCache: FetchCache, eventBus: EventBus) {

        this.fetchCache = fetchCache;
        this.eventBus = eventBus;
        this.cacheKeys = [];
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.errors = [];
        this.setupCallbacks();
    }

    /*
     * Called when an API request starts
     * Fires ApiRequestEvent(false) on the first request of a batch to signal loading has begun
     */
    public onApiRequestStart(cacheKey: string): void {

        if (this.loadingCount === 0) {
            this.cacheKeys = [];
            this.eventBus.emit(UIEventNames.ApiRequest, null, new ApiRequestEvent(false));
        }

        this.cacheKeys.push(cacheKey);
        ++this.loadingCount;
    }

    /*
     * Called when an API request ends
     * Fires ApiRequestEvent(true) once all pending requests in the batch have finished
     */
    public onApiRequestEnd(): void {

        ++this.loadedCount;
        this.handleAllRequestsComplete();
    }

    /*
     * Return true if there were any errors on the last batch of API requests
     */
    public hasErrors(): boolean {
        return this.errors.length > 0;
    }

    /*
     * Handle OAuth related errors once all requests in the batch finish
     */
    private handleAllRequestsComplete(): void {

        if (this.loadedCount === this.loadingCount) {

            // Reset counts
            this.loadingCount = 0;
            this.loadedCount = 0;

            // Get error details stored in the fetch cache
            this.errors = this.getAllErrors();

            // Notify subscribers when all API requests have completed successfully
            if (this.errors.length === 0) {
                this.eventBus.emit(UIEventNames.ApiRequest, null, new ApiRequestEvent(true));
            }

            // Login required errors occur when there are no tokens yet or when token refresh fails
            // Raise a single event so that navigation to login required is triggered only once
            const loginRequired = this.errors.find((e) => e.getErrorCode() === ErrorCodes.loginRequired);
            if (loginRequired) {
                this.eventBus.emit(UIEventNames.LoginRequired, new LoginRequiredEvent());
            }
        }
    }

    /*
     * Collect errors for the current batch of requests
     */
    private getAllErrors(): UIError[] {

        const errors: UIError[] = [];

        this.cacheKeys.forEach((k) => {

            const found = this.fetchCache.getItem(k);
            const error = found?.getError();
            if (error) {
                errors.push(error);
            }
        });

        return errors;
    }

    /*
     * Reset all state when the user logs out
     */
    public resetState(): void {

        this.errors = [];
        this.cacheKeys = [];
        this.loadingCount = 0;
        this.loadedCount = 0;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks(): void {
        this.onApiRequestStart = this.onApiRequestStart.bind(this);
        this.onApiRequestEnd = this.onApiRequestEnd.bind(this);
    }
}
