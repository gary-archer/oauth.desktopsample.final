import * as ChildProcess from 'child_process';

/*
 * A class to start the app in an OS specific manner
 */
class Starter {

    /*
     * The execute function
     */
    public execute(): void {

        const path = this._getBuiltAppPath();

        const args = [];
        if (process.env.HTTPS_PROXY) {
            args.push(`--proxy-server=${process.env.HTTPS_PROXY as string}`);
        }

        console.log(`Starting app with command ${path} and arguments ${args}`);
        const app = ChildProcess.execFile(path, args);
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
