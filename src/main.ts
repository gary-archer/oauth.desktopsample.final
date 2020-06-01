import {app, BrowserWindow, ipcMain, Menu, session, shell} from 'electron';
import DefaultMenu from 'electron-default-menu';
import log from 'electron-log';
import path from 'path';
import {ApplicationEventNames} from './plumbing/events/applicationEventNames';
import {MainEvents} from './plumbing/events/mainEvents';

/*
 * The Electron main process entry point
 */
class Main {

    private _window: BrowserWindow | null;
    private _events: MainEvents | null;
    private _startupUrl: string | null;
    private readonly _customSchemeName!: string;

    public constructor() {
        this._window = null;
        this._events = null;
        this._startupUrl = null;
        this._customSchemeName = 'x-mycompany-desktopapp';
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

        // For Windows or Linux we store the startup URL when provided
        this._startupUrl = this._getDeepLinkUrl(process.argv);
    }

    /*
     * Do initialisation after the ready event
     */
    private _onReady(): void {

        if (!app.isPackaged) {

            // During development, register our private URI scheme for a non packaged app
            // https://stackoverflow.com/questions/45570589/electron-protocol-handler-not-working-on-windows
            app.setAsDefaultProtocolClient(
                this._customSchemeName,
                process.execPath,
                [path.resolve('.')]);

        } else {

            // Register our private URI scheme for a packaged app after running 'npm run pack'
            app.setAsDefaultProtocolClient(this._customSchemeName);
        }

        // Create the window and use Electron recommended security options
        this._window = new BrowserWindow({
            width: 1024,
            height: 768,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                enableRemoteModule: false,
                preload: path.join(app.getAppPath(), './preload.js'),
            },
        });

        // Create an object to manage events
        this._events = new MainEvents(this._window);

        // Ensure that our window has its own menu after Electron Packager has run
        const menu = DefaultMenu(app, shell);
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Open the developer tools at startup if required
        // this._window.webContents.openDevTools();

        // Remove the 'Origin: file://' deault header which Okta rejected for security reasons with this message:
        // 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
        const headerCallback = (details: any, callback: any) => {

            if (details.requestHeaders.Origin) {
                delete details.requestHeaders.Origin;
            }

            callback({cancel: false, requestHeaders: details.requestHeaders});
        };
        session.defaultSession!.webRequest.onBeforeSendHeaders({urls: []} as any, headerCallback);

        // Emitted when the window is closed
        this._window.on('closed', this._onClosed);

        // Register for event messages from the renderer process
        ipcMain.on(ApplicationEventNames.ON_GET_CONFIGURATION, this._events.loadConfiguration);
        ipcMain.on(ApplicationEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._onGetStartupUrl);
        ipcMain.on(ApplicationEventNames.ON_OPEN_SYSTEM_BROWSER, this._events.openSystemBrowser);
    }

    /*
     * On macOS it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open
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
     * Handle login responses or deep linking requests against the running app on Mac OS
     */
    private _onOpenUrl(event: any, customSchemeData: string) {

        event.preventDefault();

        if (this._window) {

            // If we have a running window we can just forward the notification to it
            this._receiveNotificationInRunningInstance(customSchemeData);
        } else {

            // If this is a startup deep linking message we need to store it until after startup
            this._startupUrl = customSchemeData;
        }
    }

    /*
     * The new instance of the app could have been started via deep linking
     * In this case the Electron side of the app can send us a message to get the startup URL
     */
    private _onGetStartupUrl(...args: any): void {
        this._window!.webContents.send(ApplicationEventNames.ON_GET_DEEP_LINK_STARTUP_URL, this._startupUrl);
    }

    /*
     * When the OS sends a private uri scheme notification, the existing instance of the app receives it
     */
    private _receiveNotificationInRunningInstance(customSchemeUrl: string) {

        // The existing instance must bring itself to the foreground
        this._bringExistingInstanceToForeground();

        // Send the event to the Electron app
        this._window!.webContents.send(ApplicationEventNames.ON_PRIVATE_URI_SCHEME_NOTIFICATION, customSchemeUrl);
    }

    /*
     * The first instance of the app brings itself to the foreground when it receives the private uri scheme notification
     */
    private _bringExistingInstanceToForeground(): void {

        if (this._window) {

            if (this._window.isMinimized()) {
                this._window.restore();
            }

            this._window.focus();
        }
    }

    /*
     * Look for a deep linked URL as a command line parameter
     * Note also that Chromium may add its own parameters
     */

    private _getDeepLinkUrl(argv: any): string | null {

        for (const arg of argv) {
            const value = arg as string;
            if (value.indexOf(this._customSchemeName) !== -1) {
                return value;
            }
        }

        return null;
    }

    /*
     * Dereference the window object, usually you would store windows
     * in an array if your app supports multi windows, this is the time
     * when you should delete the corresponding element
     */
    private _onClosed(): void {
        this._window = null;
    }

    /*
     * Quit when all windows are closed
     */
    private _onAllWindowsClosed(): void {

        // On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
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
        this._onGetStartupUrl = this._onGetStartupUrl.bind(this);
        this._receiveNotificationInRunningInstance = this._receiveNotificationInRunningInstance.bind(this);
        this._onClosed = this._onClosed.bind(this);
        this._onAllWindowsClosed = this._onAllWindowsClosed.bind(this);
    }
}

// Run our main class
const main = new Main();
main.execute();
