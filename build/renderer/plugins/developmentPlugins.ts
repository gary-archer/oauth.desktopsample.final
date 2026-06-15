import {Plugin} from 'rollup';

/*
 * Notify the live reload server after edits, once the initial build completes
 */
let isBuilt = false;
export function notifyBrowser(): Plugin {

    const plugin: Plugin = {
        name: 'notify-browser',
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
