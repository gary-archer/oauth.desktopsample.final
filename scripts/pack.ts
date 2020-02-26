import ChildProcess from 'child_process';
import Packager from 'electron-packager';
import FileSystem from 'fs-extra';
import Path from 'path';

/*
 * A class to package and run the app
 */
class Pack {

    /*
     * Do the work of the build
     */
    public async execute(): Promise<void> {

        try {
            // Clean existing output
            await this._clean();

            // Build the executable
            await this._build();

            // Run the executable
            this._run();

        } catch (e) {
            console.log(`BUILD: Failed: ${e}`);
        }
    }

    /*
     * Clean the existing dist folder
     */
    private async _clean(): Promise<void> {

        const distFolder = Path.join(__dirname, '../dist');

        if (await FileSystem.pathExists(distFolder)) {
            await FileSystem.remove(distFolder);
        }
    }

    /*
     * Call electron packager
     */
    private async _build(): Promise<void> {

        await Packager(this._getPackagerOptions());
    }

    /*
     * Run the built app
     */
    private _run(): void {

        // Run the packaged Electron executable
        const exePath = this._getBuiltAppPath();
        const child = ChildProcess.spawn(exePath, []);
        
        // Capture any stdout messages sent from main.ts via log.info
        child.stdout.on('data', (data: any) => {
            const text = data.toString().trim();
            if (text) {
                console.log(`*** BASICDESKTOPAPP: ${text}`);
            }
        });
    }

    /*
     * Configure options for Electron packager
     */
    private _getPackagerOptions(): any {

        // Base options
        const options: any = {
            dir: '.',
            out: 'dist',
        };

        // For Mac OS this includes our Private URI Scheme in the info.plist
        if (process.platform === 'darwin' ) {
            options.protocols = [
                {
                    name: 'basicdesktopapp',
                    schemes: ['x-mycompany-desktopapp'],
                },
            ];
        }

        return options;
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

(async () => {
    const pack = new Pack();
    await pack.execute();
})();
