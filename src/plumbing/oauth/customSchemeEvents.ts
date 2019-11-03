import * as EventEmitter from 'events';

/*
 * Events associated to our custom scheme
 */
export class CustomSchemeEvents extends EventEmitter {

    // Used when the app is started via a URL such as x-mycompany-desktopapp:/company=2
    public static ON_DEEP_LINKING_STARTUP_URL = 'custom_scheme_deeplinking_startup_url';

    // Used to receive operating system notifications once the app is running
    public static ON_CUSTOM_SCHEME_URL_NOTIFICATION = 'custom_scheme_url_notification';
}
