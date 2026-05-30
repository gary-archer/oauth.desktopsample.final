import _commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import _json from '@rollup/plugin-json';
import _terser from '@rollup/plugin-terser';
import {builtinModules} from 'module';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

// Type updates to prevent Visual Studio Code intellisense warnings
// - https://github.com/rollup/plugins/issues/1662
const commonjs = _commonjs as unknown as typeof _commonjs.default;
const json = _json as unknown as typeof _json.default;
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

    // Avoid packaging Node.js built-in modules
    external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
    ],

    watch: {
        clearScreen: false,
    },

    // Ignore circular dependency warnings for these modules, that I cannot control
    onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY' &&
            (warning.message.includes('stubborn-fs') || warning.message.includes('semver'))) {
            return;
        }

        warn(warning);
    },

    plugins: [

        // Use Node.js resolution for node_modules
        nodeResolve({
            preferBuiltins: true,
        }),

        // Convert any commonjs libraries from the node_modules folder to ECMAScript
        commonjs(),

        // The ajv module imports JSON so we need this plugin to prevent JSON being interpreted as JavaScript
        json(),

        // Use esbuild as an up to date plugin for building typescript code
        esbuild({
            tsconfig: './tsconfig-main.json',
            target: 'es2022',
        }),

        // Minimize release bundles
        isDevelopment ? [] : [ terser() ]
    ],
};

export default defineConfig(options);
