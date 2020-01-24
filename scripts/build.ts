import Packager from 'electron-packager';
import FileSystem from 'fs-extra';
import Path from 'path';

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
            console.log(`BUILD: Succeeded to: ${outFolder}`);

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
    const builder = new Builder();
    await builder.execute();
})();
