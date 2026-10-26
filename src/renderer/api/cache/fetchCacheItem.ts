/*
 * A cache item represents an API response
 */
export class FetchCacheItem {

    private data: any;

    public constructor() {
        this.data = null;
    }

    public getData(): any {
        return this.data;
    }

    public setData(value: any): void {
        this.data = value;
    }
}
