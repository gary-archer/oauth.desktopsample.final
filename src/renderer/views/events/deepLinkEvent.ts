/*
 * Used to bubble up deep link events to the React app
 */
export class DeepLinkEvent {

    private readonly _path: string;

    public constructor(path: string) {
        this._path = path;
    }

    public get path(): string {
        return this._path;
    }
}
