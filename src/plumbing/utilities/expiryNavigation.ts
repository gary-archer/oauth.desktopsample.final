import urlparse from 'url-parse';

/*
 * A utility class to manage navigating to login required and returning to the previous location after login
 */
export class ExpiryNavigation {

    /*
     * Start the login workflow by updating the hash fragment, which will invoke the login required view
     */
    public static navigateToLoginRequired() {

        if (location.hash.length > 1) {

            // Record the previous main location unless we are already in login required
            location.hash = `#/loginrequired&return=${encodeURIComponent(location.hash)}`;

        } else {

            // Default to an empty return location
            location.hash = '#/loginrequired';
        }
    }

    /*
     * Restore the location before we moved to login required above
     */
    public static restorePreLoginLocation() {

        if (location.hash.length > 1) {

            // See if the hash fragment has a return parameter
            const urlData = urlparse('?' + location.hash.substring(1), true);
            if (urlData && urlData.query && urlData.query.return) {

                // If so return to the pre login location
                const hash = decodeURIComponent(urlData.query.return);
                location.hash = hash;
                return;
            }
        }

        // Otherwise move home
        location.hash = '#';
    }
}
