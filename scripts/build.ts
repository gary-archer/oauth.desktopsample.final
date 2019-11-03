import * as Packager from 'electron-packager';
import * as FileSystem from 'fs-extra';
import * as Path from 'path';

/*
 * A class to do the build work
 */
class Builder {

    /*
     * The build function
     */
    public async execute(): Promise<void> {

        try {
            await this._clean();
            const outFolder = await this._build();
            console.log(`Build succeeded to: ${outFolder}`);

        } catch (e) {
            console.log(`Build failure: ${e}`);
        }
    }

    /*
     * Clean the existing dist folder
     */
    private async _clean(): Promise<void> {

        const distFolder = Path.join(__dirname, '../dist');

        if (await FileSystem.pathExists(distFolder)) {
            console.log(`BUILD: Deleting old package from: ${distFolder}`);
            await FileSystem.remove(distFolder);
        }
    }

    /*
     * Call electron packager
     */
    private async _build(): Promise<string> {

        console.log(`BUILD: Running Electron Packager to build executable`);
        const appPaths = await Packager(this._getPackagerOptions());
        return appPaths[0];
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
}

(async () => {
    try {
        const builder = new Builder();
        await builder.execute();
    } catch (e) {
        console.log(`Build error: ${e}`);
        process.exit(1);
    }
})();
