/*
 * An event to manage navigation
 */
export class NavigatedEvent {

    private readonly _authenticatedView: boolean;

    public constructor(authenticatedView: boolean) {
        this._authenticatedView = authenticatedView;
    }

    public get isAuthenticatedView(): boolean {
        return this._authenticatedView;
    }
}
