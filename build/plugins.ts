import fs from 'node:fs/promises';
import path from 'path';
import {NormalizedOutputOptions, OutputBundle, OutputChunk, Plugin} from 'rollup';

/*
 * A simple file copy plugin
 */
export function copyFiles(outputDir: string, files: string[]): Plugin {

    return {
        name: 'copy-files',
        writeBundle: {
            sequential: true,
            async handler() {

                for (const file of files) {

                    const targetPath = path.join(outputDir, path.basename(file));
                    await fs.copyFile(file, targetPath);
                }
            },
        },
    };
}

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

/*
 * Remove the source map line from production bundles
 * I do not deploy map files to the web host, so this prevents browser warnings in the console
 */
export function finalizeBundles(): Plugin {

    const plugin: Plugin = {

        name: 'finalize-bundles',
        generateBundle(options: NormalizedOutputOptions, bundle: OutputBundle): void {

            for (const file of Object.values(bundle)) {

                if (file.type === 'chunk') {

                    const chunk = file as OutputChunk;
                    chunk.code = chunk.code
                        .replace(/\s*\/\/[@#]\s*sourceMappingURL=.*\s*$/, '')
                        .replace(/\s+$/, '');
                }
            }
        },
    };

    return plugin;
}
