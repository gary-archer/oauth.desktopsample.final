/*
 * Used to bubble up deep link events to the React app
 */
export class DeepLinkEvent {

    private readonly path: string;

    public constructor(path: string) {
        this.path = path;
    }

    public getPath(): string {
        return this.path;
    }
}
