/*
 * A utility class to determine the current route
 */
export class RouteHelper {

    /*
     * Return true if we are not in the logged out view or the transactions view
     */
    public static isInHomeView(): boolean {
        return !RouteHelper.isInLoginRequiredView() && (location.hash.indexOf('company=') === -1);
    }

    /*
     * Return true if we are in the login required view
     */
    public static isInLoginRequiredView(): boolean {
        return (location.hash.indexOf('loggedout') !== -1);
    }
}
