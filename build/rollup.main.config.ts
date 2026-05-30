
import _commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import _json from '@rollup/plugin-json';
import _terser from '@rollup/plugin-terser';
import _typescript from '@rollup/plugin-typescript';
import {builtinModules} from 'module';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';

// Type updates to prevent Visual Studio Code intellisense warnings
// - https://github.com/rollup/plugins/issues/1662
const commonjs = _commonjs as unknown as typeof _commonjs.default;
const json = _commonjs as unknown as typeof _json.default;
const typescript = _typescript as unknown as typeof _typescript.default;
const terser = _terser as unknown as typeof _terser.default;

// Set base values and use the watch flag to distinguish between development v production builds
const isDevelopment = process.env.BUILD === 'debug';
const outputFolder = 'dist';

const options: RollupOptions = {

    input: './src/main.ts',
    output: {

        // Output ECMAScript modules
        dir: outputFolder,
        format: 'esm',
        entryFileNames: 'main.bundle.js',

        // Enable source maps and use correct paths to support SPA debugging
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            return path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
        },
    },

    // Avoid packaging Node.js built in modules and the AWS SDK
    external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
    ],

    watch: {
        clearScreen: false,
    },

    plugins: [

        // Use Node.js resolution for node_modules
        nodeResolve({
            preferBuiltins: true,
        }),

        // Handle code that imports JSON
        json(),

        // Convert any commonjs libraries from the node_modules folder to ECMAScript
        commonjs(),

        // Use tslib and the typescript plugin with the settings from the tsconfig.json file
        typescript({
            ignoreDeprecations: '6.0',
        }),

        // Minimize release bundles
        isDevelopment ? [] : [ terser() ]
    ],
};

export default defineConfig(options);
