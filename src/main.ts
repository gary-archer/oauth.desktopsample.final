import {app, BrowserWindow, session} from 'electron';
import path from 'path';
import {Configuration} from './configuration/configuration';
import {ConfigurationLoader} from './configuration/configurationLoader';
import {ErrorFactory} from './plumbing/errors/errorFactory';
import {MainEvents} from './plumbing/ipc/mainEvents';

/*
 * The Electron main process entry point
 */
class Main {

    private _window: BrowserWindow | null;
    private _ipcEvents: MainEvents | null;
    private _configuration: Configuration | null;
    private _useBasicContentSecurityPolicy: boolean;

    public constructor() {
        this._window = null;
        this._ipcEvents = null;
        this._configuration = null;
        this._useBasicContentSecurityPolicy = false;
        this._setupCallbacks();
    }

    /*
     * The entry point function
     */
    public execute(): void {

        // Prevent private URI scheme notifications on Windows + Linux from creating a new instance of the application
        const primaryInstance = app.requestSingleInstanceLock();
        if (!primaryInstance) {
            app.quit();
            return;
        }

        // Attempting to start a second instance will fire the following event to the running instance
        app.on('second-instance', this._onSecondInstance);

        // Initialise the primary instance of the application
        this._initializeApplication();
    }

    /*
     * Set up our application the first time it is invoked
     */
    private _initializeApplication(): void {

        // This method will be called when Electron has finished initialization and is ready to create browser windows
        // Some APIs can only be used after this event occurs
        app.on('ready', this._onReady);

        // Quit when all windows are closed
        app.on('window-all-closed', this._onAllWindowsClosed);

        // Handle reactivation
        app.on('activate', this._onActivate);

        // Handle login responses or deep linking requests against the running app on Mac OS
        app.on('open-url', this._onOpenUrl);

        // For Windows or Linux we receive a startup deep link URL as a command line parameter
        /*const startupUrl = this._getDeepLinkUrl(process.argv);
        if (startupUrl) {
            this._ipcEvents?.deepLinkStartupUrl = startupUrl;
        }*/
    }

    /*
     * Do initialisation after the ready eventF
     */
    private _onReady(): void {

        // Create the window and use Electron recommended security options
        // https://www.electronjs.org/docs/tutorial/security
        this._window = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(app.getAppPath(), './preload.js'),
            },
        });

        // Load configuration and initialize server side classes
        this._configuration = ConfigurationLoader.load(`${app.getAppPath()}/desktop.config.json`);
        this._ipcEvents = new MainEvents(this._configuration, this._window);

        // Register for private URI scheme notifications
        this._registerPrivateUriScheme();

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Configure HTTP headers
        this._initialiseHttpHeaders();

        // Emitted when the window is closed
        this._window.on('closed', this._onClosed);

        // Register for event based communication with the renderer process
        this._ipcEvents?.register();
    }

    /*
     * On macOS the window is recreated when the dock icon is clicked and there are no other windows open
     */
    private _onActivate(): void {

        if (this._window === null) {
            this._onReady();
        }
    }

    /*
     * On Windows and Linux, this is where we receive login responses or other deep links
     */
    private _onSecondInstance(event: any, argv: any) {

        const url = this._getDeepLinkUrl(argv);
        if (url) {
            this._receiveNotificationInRunningInstance(url);
        }
    }

    /*
     * Set required or recommended headers
     */
    private _initialiseHttpHeaders() {

        // Remove the 'Origin: file://' default header which may be rejected for security reasons with this message
        // 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
        session.defaultSession.webRequest.onBeforeSendHeaders({urls: []} as any, (details, callback) => {

            if (details.requestHeaders.Origin) {
                delete details.requestHeaders.Origin;
            }

            callback({cancel: false, requestHeaders: details.requestHeaders});
        });

        // Set a content security policy as a security best practice
        // This prevents show dev tools from working, so control this via a property that can be set during development
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {

            let policy = '';
            if (this._useBasicContentSecurityPolicy) {

                // In some development use cases, disable the secure CSP
                policy += "script-src 'self' 'unsafe-eval'";

            } else {

                // The secure CSP is used otherwise
                const trustedHosts = this._configuration!.app.trustedHosts.join(' ');
                policy += "default-src 'none';";
                policy += " script-src 'self';";
                policy += ` connect-src 'self' ${trustedHosts};`;
                policy += " child-src 'self';";
                policy += " img-src 'self';";
                policy += " style-src 'self';";
                policy += " object-src 'none';";
                policy += " frame-ancestors 'none';";
                policy += " base-uri 'self';";
                policy += " form-action 'self'";
            }

            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [policy],
                },
            });
        });
    }

    /*
     * On MacOS this is where we receive login responses or other deep links
     */
    private _onOpenUrl(event: any, schemeData: string) {

        event.preventDefault();

        if (this._window) {

            // If we have a running window we can just forward the notification to it
            this._receiveNotificationInRunningInstance(schemeData);
        } else {

            // If this is a startup deep linking message we need to store it until after startup
            // this._ipcEvents.deepLinkStartupUrl = schemeData;
        }
    }

    /*
     * When the OS sends a private uri scheme notification, the existing instance of the app receives it
     */
    private _receiveNotificationInRunningInstance(privateSchemeUrl: string) {

        // The existing instance of the app brings itself to the foreground
        if (this._window) {

            if (this._window.isMinimized()) {
                this._window.restore();
            }

            this._window.focus();
        }

        // Send the event to the renderer side of the app
        this._ipcEvents?.sendPrivateSchemeNotificationUrl(privateSchemeUrl);
    }

    /*
     * Look for a deep linked URL as a command line parameter
     * Note also that Chromium may add its own parameters
     */
    private _getDeepLinkUrl(argv: any): string | null {

        for (const arg of argv) {
            const value = arg as string;
            if (value.indexOf(this._configuration!.oauth.privateSchemeName) !== -1) {
                return value;
            }
        }

        return null;
    }

    /*
     * Dereference any window objects here
     */
    private _onClosed(): void {
        this._window = null;
    }

    /*
     * Quit when all windows are closed
     * On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
     */
    private _onAllWindowsClosed(): void {

        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    /*
     * Handle private URI scheme registration
     */
    private async _registerPrivateUriScheme(): Promise<void> {

        if (process.platform === 'win32') {

            // Register the private URI scheme differently for Windows
            // https://stackoverflow.com/questions/45570589/electron-protocol-handler-not-working-on-windows
            app.setAsDefaultProtocolClient(
                this._configuration!.oauth.privateSchemeName,
                process.execPath,
                [app.getAppPath()]);

        } else {

            // Register our private URI scheme for a packaged app after running 'npm run pack'
            app.setAsDefaultProtocolClient(this._configuration!.oauth.privateSchemeName);
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._onReady = this._onReady.bind(this);
        this._onActivate = this._onActivate.bind(this);
        this._onSecondInstance = this._onSecondInstance.bind(this);
        this._onOpenUrl = this._onOpenUrl.bind(this);
        this._receiveNotificationInRunningInstance = this._receiveNotificationInRunningInstance.bind(this);
        this._onClosed = this._onClosed.bind(this);
        this._onAllWindowsClosed = this._onAllWindowsClosed.bind(this);
    }
}

try {
    // Run our main class
    const main = new Main();
    main.execute();

} catch (e: any) {

    // Handle startup errors
    const error = ErrorFactory.fromException(e);
    console.log(error.toLogFormat());
    app.exit();
}
