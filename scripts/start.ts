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
        const args: string[] = [];

        // Indicate the command to run
        console.log(`START: Running command ${path}`);

        // Run the Electron main process
        const child = ChildProcess.spawn(path, args);
        
        // Capture any stdout messages
        child.stdout.on('data', (data: any) => {
            const text = data.toString().trim();
            if (text) {
                console.log(`*** BASICDESKTOPAPP: ${text}`);
            }
        });
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
