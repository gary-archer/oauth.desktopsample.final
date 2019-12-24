import ChildProcess from 'child_process';

/*
 * A class to start the app in an OS specific manner
 */
class Starter {

    /*
     * The execute function
     */
    public execute(): void {

        const path = this._getBuiltAppPath();

        // In some environments force use of a proxy server via Chromium parameters
        const args: string[] = [];
        if (process.env.HTTPS_PROXY) {
            args.push(`--proxy-server=${process.env.HTTPS_PROXY as string}`);
        }

        // Indicate the command to run
        console.log(`START: Running command ${path}`);

        // Run the Electron main process and capture its stdout for debugging
        const child = ChildProcess.spawn(path, args);
        child.stdout.on('data', (data) => {
            console.log(`*** MAIN: ${data.toString()}`);
        })
    }

    /*
     * Get the executable path depending on the operating system
     */
    private _getBuiltAppPath(): string {

        const name = 'basicdesktopapp';
        if (process.platform === 'win32') {

            // Windows output location
            return `${__dirname}/../dist/${name}-win32-x64/${name}`;

        } else if (process.platform === 'darwin' ) {

            // Mac OS output location
            return `${__dirname}/../dist/${name}-darwin-x64/${name}.app/Contents/MacOS/${name}`;

        } else {

            // Linux output location
            return `${__dirname}/../dist/${name}-linux-x64/${name}`;
        }
    }
}

// Start the program
const starter = new Starter();
starter.execute();
