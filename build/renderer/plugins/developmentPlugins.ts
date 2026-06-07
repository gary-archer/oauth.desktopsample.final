import {Plugin} from 'rollup';

/*
 * Copy these resources to the output folder when they are edited
 */
export function copyOnEdit(): Plugin {

    const plugin: Plugin = {
        name: 'copy-on-edit',
        buildStart(): void {
            this.addWatchFile('index.html');
            this.addWatchFile('css');
        }
    };

    return plugin;
}

/*
 * Notify the live reload server after edits, once the initial build completes
 */
let isBuilt = false;
export function notifyBrowser(): Plugin {

    const plugin: Plugin = {
        name: 'open-browser',
        async writeBundle(): Promise<void> {

            if (!isBuilt) {
                isBuilt = true;
                return;
            }

            await fetch('http://localhost:35729/reload');
        }
    };

    return plugin;
}
