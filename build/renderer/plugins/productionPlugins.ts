import {NormalizedOutputOptions, OutputBundle, OutputChunk, Plugin} from 'rollup';

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
