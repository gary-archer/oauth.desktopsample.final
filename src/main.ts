import {app, BrowserWindow, net, protocol, session} from 'electron';
import path from 'path';
import url from 'url';
import {Configuration} from './main/configuration/configuration';
import {ConfigurationLoader} from './main/configuration/configurationLoader';
import {IpcMainEvents} from './main/ipcMainEvents';
import {ErrorFactory} from './shared/errors/errorFactory';

/*
 * The Electron main process entry point
 */
class Main {

    private configuration: Configuration;
    private ipcEvents: IpcMainEvents;
    private window: BrowserWindow | null;

    public constructor() {

        this.configuration = ConfigurationLoader.load(`${app.getAppPath()}/desktop.config.json`);
        this.ipcEvents = new IpcMainEvents(this.configuration);
        this.window = null;
        this.setupCallbacks();
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
        app.on('second-instance', this.onSecondInstance);

        // This method will be called when Electron has finished initialization and is ready to create browser windows
        // Some APIs can only be used after this event occurs
        app.on('ready', this.onReady);

        // Quit when all windows are closed
        app.on('window-all-closed', this.onAllWindowsClosed);

        // Handle reactivation
        app.on('activate', this.onActivate);

        // Handle login responses or deep linking requests against the running app on Mac OS
        app.on('open-url', this.onOpenUrl);

        // For Windows or Linux we receive a startup deep link URL as a command line parameter
        const startupUrl = this.getDeepLinkUrl(process.argv);
        if (startupUrl) {
            this.ipcEvents.deepLinkStartupUrl = startupUrl;
        }

        // Enable HTML resource download using the private scheme
        protocol.registerSchemesAsPrivileged([{
            scheme: this.configuration.app.protocolScheme,
            privileges: {
                bypassCSP: true,
            },
        }]);
    }

    /*
     * Do initialisation after the ready event
     */
    private async onReady(): Promise<void> {

        // Handle requests for web files
        protocol.handle(this.configuration.app.protocolScheme, this.onServeWebFiles);

        // Create the window and use Electron recommended security options
        // https://www.electronjs.org/docs/tutorial/security
        this.window = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                preload: path.join(app.getAppPath(), './preload.js'),
            },
        });

        // Register for event based communication with the renderer process
        this.ipcEvents.register(this.window);

        // Register for private URI scheme notifications
        this.registerPrivateUriScheme();

        // Load the index.html of the app using the private URI scheme handler
        this.window.loadURL(`${this.configuration.app.protocolScheme}:/index.html`);

        // Configure HTTP headers
        this.initialiseHttpHeaders();

        // Emitted when the window is closed
        this.window.on('closed', this.onClosed);
    }

    /*
     * On macOS the window is recreated when the dock icon is clicked and there are no other windows open
     */
    private onActivate(): void {

        if (this.window === null) {
            this.onReady();
        }
    }

    /*
     * Process requests for web files
     * Use a custom protocol handler in line with Electron security recommendations
     */
    private onServeWebFiles(request: Request) {

        const urlPath = new URL(request.url).pathname;
        return net.fetch(url.pathToFileURL(path.join(__dirname, urlPath)).toString());
    }

    /*
     * On Windows and Linux, this is called when we receive login responses or other deep links
     */
    private onSecondInstance(event: any, argv: any): void {

        const url = this.getDeepLinkUrl(argv);
        if (url) {
            this.handleDeepLink(url);
        }
    }

    /*
     * Set a content security policy for the renderer app
     */
    private initialiseHttpHeaders() {

        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {

            let policy = '';
            policy += "default-src 'none';";
            policy += " script-src 'self';";
            policy += " connect-src 'self';";
            policy += " child-src 'self';";
            policy += " img-src 'self';";
            policy += " style-src 'self';";
            policy += " object-src 'none';";
            policy += " frame-ancestors 'none';";
            policy += " base-uri 'self';";
            policy += " form-action 'self'";

            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [policy],
                },
            });
        });
    }

    /*
     * On macOS this is where we receive login responses or other deep links
     */
    private onOpenUrl(event: any, schemeData: string): void {

        event.preventDefault();

        if (this.window) {

            // If we have a running window we can just forward the notification to it
            this.handleDeepLink(schemeData);

        } else {

            // If this is a startup deep linking message we need to store it until after startup
            this.ipcEvents.deepLinkStartupUrl = schemeData;
        }
    }

    /*
     * When the OS sends a deep link notification, the existing instance of the app receives it
     */
    private handleDeepLink(deepLinkUrl: string): void {

        // The existing instance of the app brings itself to the foreground
        if (this.window) {

            if (this.window.isMinimized()) {
                this.window.restore();
            }

            this.window.focus();
        }

        // Send the event to the renderer side of the app
        this.ipcEvents.handleDeepLink(deepLinkUrl);
    }

    /*
     * Look for a deep link URL as a command line parameter
     * Note also that Chromium may add its own parameters
     */
    private getDeepLinkUrl(argv: any): string | null {

        for (const arg of argv) {
            const value = arg as string;
            if (value.indexOf(this.configuration.app.protocolScheme) !== -1) {
                return value;
            }
        }

        return null;
    }

    /*
     * Dereference any window objects here
     */
    private onClosed(): void {
        this.window = null;
    }

    /*
     * Quit when all windows are closed
     * On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
     */
    private onAllWindowsClosed(): void {

        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    /*
     * Register for private URI scheme notifications on Windows or macOS
     * On Linux the registration is done by the run.sh script instead
     */
    private registerPrivateUriScheme(): void {

        if (process.platform === 'win32') {

            // Register the private URI scheme differently for Windows
            // https://stackoverflow.com/questions/45570589/electron-protocol-handler-not-working-on-windows
            app.setAsDefaultProtocolClient(
                this.configuration.app.protocolScheme,
                process.execPath,
                [app.getAppPath()]);

        } else if (process.platform === 'darwin') {

            // Register our private URI scheme for a packaged app after running 'npm run pack'
            app.setAsDefaultProtocolClient(this.configuration.app.protocolScheme);
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.onReady = this.onReady.bind(this);
        this.onActivate = this.onActivate.bind(this);
        this.onServeWebFiles = this.onServeWebFiles.bind(this);
        this.onSecondInstance = this.onSecondInstance.bind(this);
        this.onOpenUrl = this.onOpenUrl.bind(this);
        this.handleDeepLink = this.handleDeepLink.bind(this);
        this.onClosed = this.onClosed.bind(this);
        this.onAllWindowsClosed = this.onAllWindowsClosed.bind(this);
    }
}

try {
    // Run our main class
    const main = new Main();
    main.execute();

} catch (e: any) {

    // Handle startup errors
    const error = ErrorFactory.fromException(e);
    console.log(error.toJson(true));
    app.exit();
}
