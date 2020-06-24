/*
 * Named events for the UI
 */
export class ApplicationEventNames {

    // The UI sends requests to the login required page
    public static readonly ON_LOGIN = 'login';

    // The UI sends this event to ask views to reload themselves
    public static readonly ON_RELOAD = 'reload';
}
