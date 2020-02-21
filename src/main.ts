import {app, BrowserWindow, ipcMain, Menu, session, shell} from 'electron';
import DefaultMenu from 'electron-default-menu';
import log from 'electron-log';
import {CustomSchemeEvents} from './plumbing/utilities/customSchemeEvents';

/*
 * The Electron main process entry point
 */
class Main {

    private _window: any;
    private _startupUrl: string | null;
    private readonly _customSchemeName: string;

    public constructor() {
        this._window = null;
        this._startupUrl = null;
        this._customSchemeName = 'x-mycompany-desktopapp';
        this._setupCallbacks();
    }

    /*
     * The entry point function
     */
    public execute(): void {

        // Prevent custom scheme notifications on Windows and Linux from creating a new instance of the application
        const primaryInstance = app.requestSingleInstanceLock();
        if (!primaryInstance) {
            app.quit();
            return;
        }

        // Show a startup message, which is reported to the console
        log.info('STARTING ELECTRON MAIN PROCESS');

        // Forward to the existing instance of the application
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
        app.on('ready', this._createMainWindow);

        // Quit when all windows are closed
        app.on('window-all-closed', this._onAllWindowsClosed);

        // Handle reactivation
        app.on('activate', this._onActivate);

        // Register our private URI scheme for the current user when we run for the first time
        app.setAsDefaultProtocolClient(this._customSchemeName);

        // Handle login responses or deep linking requests against the running app on Mac OS
        app.on('open-url', this._onOpenUrl);

        // For Windows or Linux we store the startup URL from the process object
        if (process.argv.length > 1) {
            this._startupUrl = process.argv[1];
        }
    }

    /*
     * Do the main window creation
     */
    private _createMainWindow(): void {

        // Create the browser window
        // Note that node integration is needed in order to use 'require' in index.html
        this._window = new BrowserWindow({
            width: 1024,
            height: 768,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
            },
        });

        // Ensure that our window has its own menu after Electron Packager has run
        const menu = DefaultMenu(app, shell);
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Open the developer tools at startup if required
        this._window.webContents.openDevTools();

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

        // The new instance of the app could have been started via deep linking
        // In this case the Electron side of the app can send us a message to get the URL
        ipcMain.on(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, this._onDeepLink);
    }

    /*
     * On macOS it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open
     */
    private _onActivate(): void {

        if (this._window === null) {
            this._createMainWindow();
        }
    }

    /*
     * See if we have a custom scheme notification, and note that Chromium may add its own parameters
     */
    private _onSecondInstance(event: any, argv: any) {

        for (const arg of argv) {
            const value = arg as string;
            if (value.indexOf(this._customSchemeName) !== -1) {
                this._receiveNotificationInRunningInstance(value);
                break;
            }
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
     * In this case the Electron side of the app can send us a message to get the URL
     */
    private _onDeepLink(): void {
        this._window.webContents.send(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, this._startupUrl);
    }

    /*
     * The existing instance receives custom scheme notifications when the OS sends us a custom scheme notification
     */
    private _receiveNotificationInRunningInstance(customSchemeUrl: string) {

        // The existing instance must bring itself to the foreground
        this._bringExistingInstanceToForeground();

        // Now send an event to the Electron app
        this._window.webContents.send(CustomSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION, customSchemeUrl);
    }

    /*
     * The first instance of the app brings itself to the foreground when it receives the custom scheme notification
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

        // For convenience, to allow us to run from multiple locations, we unregister here
        app.removeAsDefaultProtocolClient(this._customSchemeName);

        // On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._createMainWindow = this._createMainWindow.bind(this);
        this._onActivate = this._onActivate.bind(this);
        this._onSecondInstance = this._onSecondInstance.bind(this);
        this._onOpenUrl = this._onOpenUrl.bind(this);
        this._onDeepLink = this._onDeepLink.bind(this);
        this._receiveNotificationInRunningInstance = this._receiveNotificationInRunningInstance.bind(this);
        this._onClosed = this._onClosed.bind(this);
        this._onAllWindowsClosed = this._onAllWindowsClosed.bind(this);
    }
}

// Run our main class
const main = new Main();
main.execute();
