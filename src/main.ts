import {app, BrowserWindow, ipcMain, Menu, session, shell} from 'electron';
import * as DefaultMenu from 'electron-default-menu';
import * as Path from 'path';
import * as Url from 'url';
import {CustomSchemeEvents} from './plumbing/oauth/customSchemeEvents';

const customSchemeName = 'x-mycompany-desktopapp';

/*
 * The Electron main process, which loads the renderer process app.ts
 */
class Main {

    /*
     * The entry point function
     */
    public static execute(): void {

        // All custom scheme notifications on Windows and Linux will try to create a new instance of the application
        const primaryInstance = app.requestSingleInstanceLock();
        if (!primaryInstance) {
            app.quit();
            return;
        }

        // The primary instance of the application will run this code, not the new instance
        app.on('second-instance', (event: any, argv: any) => {

            // See if we have a custom scheme notification, and note that Chromium may add its own parameters
            for (const arg of argv) {
                const value = arg as string;
                if (value.indexOf(customSchemeName) !== -1) {
                    Main._receiveCustomSchemeNotificationInRunningInstance(value);
                    break;
                }
            }
        });

        // Initialise the primary instance of the application
        Main._initializeApplication();
    }

    /*
     * Static data
     */
    private static _window: any = null;
    private static _startupUrl: string | null = null;

    /*
     * Set up our application the first time it is invoked
     */
    private static _initializeApplication(): void {

        // This method will be called when Electron has finished
        // initialization and is ready to create browser windows.
        // Some APIs can only be used after this event occurs.
        app.on('ready', Main._createMainWindow);

        // Quit when all windows are closed
        app.on('window-all-closed', () => {

            // For convenience, to allow us to run from multiple locations, we unregister here
            app.removeAsDefaultProtocolClient(customSchemeName);

            // On macOS, applications and their menu barstay active until the user quits explicitly with Cmd + Q
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {

            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open
            if (Main._window === null) {
                Main._createMainWindow();
            }
        });

        // Register our private URI scheme for the current user when we run for the first time
        app.setAsDefaultProtocolClient(customSchemeName);

        // Handle login responses or deep linking requests against the running app on Mac OS
        app.on('open-url', (event: any, customSchemeData: string) => {
            event.preventDefault();

            if (Main._window) {

                // If we have a running window we can just forward the notification to it
                Main._receiveCustomSchemeNotificationInRunningInstance(customSchemeData);
            } else {

                // If this is a startup deep linking message we need to store it until after startup
                Main._startupUrl = customSchemeData;
            }
        });

        // For Windows or Linux we store the startup URL from the process object
        if (process.argv.length > 1) {
            Main._startupUrl = process.argv[1];
        }
    }

    /*
     * Do the main window creation
     */
    private static _createMainWindow(): void {

        // Create the browser window
        // Note that node integration is needed in order to use 'require' in index.html
        Main._window = new BrowserWindow({
            width: 1024,
            height: 768,
            minWidth: 480,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
            },
        });

        // Ensure that our window has its own menu after Electron Packager has run
        const menu = DefaultMenu(app, shell);
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

        // Load the index.html of the app from the file system
        Main._window.loadURL(Url.format({
            pathname: Path.join(__dirname, '../index.html'),
            protocol: 'file:',
            slashes: true,
        }));

        // Open the developer tools at startup if required
        // Main._window.webContents.openDevTools();

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
        Main._window.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element
            Main._window = null;
        });

        // The new instance of the app could have been started via deep linking
        // In this case the Electron side of the app can send us a message to get the URL
        ipcMain.on(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, (event: any, result: any) => {
            Main._window.webContents.send(CustomSchemeEvents.ON_DEEP_LINKING_STARTUP_URL, Main._startupUrl);
        });
    }

    /*
     * The existing instance receives custom scheme notifications when the OS sends us a custom scheme notification
     */
    private static _receiveCustomSchemeNotificationInRunningInstance(customSchemeUrl: string) {

        // The existing instance must bring itself to the foreground
        Main._bringExistingInstanceToForeground();

        // Now send an event to the Electron app
        Main._window.webContents.send(CustomSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION, customSchemeUrl);
    }

    /*
     * The first instance of the app brings itself to the foreground when it receives the custom scheme notification
     */
    private static _bringExistingInstanceToForeground(): void {

        if (Main._window) {

            if (Main._window.isMinimized()) {
                Main._window.restore();
            }

            Main._window.focus();
        }
    }
}

// Run our main class
Main.execute();
