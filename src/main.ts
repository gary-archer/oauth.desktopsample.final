import {app, BrowserWindow, Menu, session, shell} from 'electron';
import DefaultMenu from 'electron-default-menu';
import log from 'electron-log';
import path from 'path';
import {MainEvents} from './plumbing/events/mainEvents';

/*
 * The Electron main process entry point
 */
class Main {

    private _window: BrowserWindow | null;
    private _events: MainEvents;
    private readonly _privateSchemeName: string;

    public constructor() {
        this._window = null;
        this._events = new MainEvents();
        this._privateSchemeName = 'x-mycompany-desktopapp';
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

        // Show a startup message, which is reported to the console
        log.info('STARTING ELECTRON MAIN PROCESS');

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

        // Set this to avoid a warning and to improve performance
        app.allowRendererProcessReuse = true;

        // Handle login responses or deep linking requests against the running app on Mac OS
        app.on('open-url', this._onOpenUrl);

        // For Windows or Linux we receive the startup URL as a startup parameter
        const startupUrl = this._getDeepLinkUrl(process.argv);
        if (startupUrl) {
            this._events.deepLinkStartupUrl = startupUrl;
        }
    }

    /*
     * Do initialisation after the ready eventF
     */
    private _onReady(): void {

        // Create the window and use Electron recommended security options
        // https://www.electronjs.org/docs/tutorial/security
        this._window = new BrowserWindow({
            width: 1024,
            height: 768,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                enableRemoteModule: false,
                contextIsolation: true,
                preload: path.join(app.getAppPath(), './preload.js'),
            },
        });

        // Set values against the events instance
        this._events.window = this._window;
        this._events.configurationFileName = 'desktop.config.json';

        // Register for private URI scheme notifications
        this._registerPrivateUriScheme();

        // Ensure that our window has its own menu after Electron Packager has run
        const menu = DefaultMenu(app, shell);
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Configure HTTP headers
        this._initialiseOutgoingHttpRequestHeaders();

        // Emitted when the window is closed
        this._window.on('closed', this._onClosed);

        // Register for event based communication with the renderer process
        this._events.register();

        // Open the developer tools at startup if required
        // this._window.webContents.openDevTools();
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
     * If we have a private uri scheme notification, forward it to the existing application instance
     */
    private _onSecondInstance(event: any, argv: any) {

        const url = this._getDeepLinkUrl(argv);
        if (url) {
            this._receiveNotificationInRunningInstance(url);
        }
    }

    /*
     * Remove the 'Origin: file://' deault header which Okta rejected for security reasons with this message
     * 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
     */
    private _initialiseOutgoingHttpRequestHeaders() {

        const headerCallback = (details: any, callback: any) => {

            if (details.requestHeaders.Origin) {
                delete details.requestHeaders.Origin;
            }

            callback({cancel: false, requestHeaders: details.requestHeaders});
        };
        session.defaultSession!.webRequest.onBeforeSendHeaders({urls: []} as any, headerCallback);
    }

    /*
     * Handle login responses or deep linking requests against the running app on Mac OS
     */
    private _onOpenUrl(event: any, schemeData: string) {

        event.preventDefault();

        if (this._window) {

            // If we have a running window we can just forward the notification to it
            this._receiveNotificationInRunningInstance(schemeData);
        } else {

            // If this is a startup deep linking message we need to store it until after startup
            this._events.deepLinkStartupUrl = schemeData;
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
        this._events.sendPrivateSchemeNotificationUrl(privateSchemeUrl)
    }

    /*
     * Look for a deep linked URL as a command line parameter
     * Note also that Chromium may add its own parameters
     */
    private _getDeepLinkUrl(argv: any): string | null {

        for (const arg of argv) {
            const value = arg as string;
            if (value.indexOf(this._privateSchemeName) !== -1) {
                return value;
            }
        }

        return null;
    }

    /*
     * Dereference any window objects here
     */
    private _onClosed(): void {

        this._unregisterPrivateUriScheme();
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
    private _registerPrivateUriScheme() {

        if (!app.isPackaged) {

            // During development, register our private URI scheme for a non packaged app
            // https://stackoverflow.com/questions/45570589/electron-protocol-handler-not-working-on-windows
            app.setAsDefaultProtocolClient(
                this._privateSchemeName,
                process.execPath,
                [app.getAppPath()]);

        } else {

            // Register our private URI scheme for a packaged app after running 'npm run pack'
            app.setAsDefaultProtocolClient(this._privateSchemeName);
        }
    }

    /*
     * Avoid leaving the registration in place so that we can switch between packaged and non packaged builds
     */
    private _unregisterPrivateUriScheme() {

        if (!app.isPackaged && process.platform === 'win32') {

            app.removeAsDefaultProtocolClient(
                this._privateSchemeName,
                process.execPath,
                [app.getAppPath()]);

        } else {

            app.removeAsDefaultProtocolClient(this._privateSchemeName);
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

// Run our main class
const main = new Main();
main.execute();
