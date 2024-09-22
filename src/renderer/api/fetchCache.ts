import {FetchCacheItem} from './fetchCacheItem';

/*
 * A cache to prevent redundant HTTP requests
 * This is used when the data for a view has already been retrieved
 * This includes during back navigation and re-entrancy due to React strict mode
 */
export class FetchCache {

    // A map of cache keys to API responses
    private _requests: Record<string, FetchCacheItem> = {};

    /*
     * Create an item with no data when an API request is triggered
     */
    public createItem(key: string): FetchCacheItem {

        let item = this.getItem(key);
        if (!item) {

            item = new FetchCacheItem();
            this._requests[key] = item;
        }

        return item;
    }

    /*
     * Get an item if it exists
     */
    public getItem(key: string): FetchCacheItem | null {
        return this._requests[key];
    }

    /*
     * Remove an item when forcing a reload
     */
    /* eslint-disable @typescript-eslint/no-dynamic-delete */
    public removeItem(key: string): void {

        if (this._requests[key]) {
            delete this._requests[key];
        }
    }

    /*
     * Clear the cache when logging out
     */
    public clearAll(): void {
        this._requests = {};
    }
}
