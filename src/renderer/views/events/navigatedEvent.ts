/*
 * An event to manage navigation
 */
export class NavigatedEvent {

    private readonly authenticatedView: boolean;

    public constructor(authenticatedView: boolean) {
        this.authenticatedView = authenticatedView;
    }

    public getIsAuthenticatedView(): boolean {
        return this.authenticatedView;
    }
}
