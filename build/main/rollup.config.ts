import _commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import _json from '@rollup/plugin-json';
import _replace from '@rollup/plugin-replace';
import _terser from '@rollup/plugin-terser';
import {builtinModules} from 'module';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import _copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';

// Type updates to prevent Visual Studio Code intellisense warnings
// - https://github.com/rollup/plugins/issues/1662
const commonjs = _commonjs as unknown as typeof _commonjs.default;
const copy = _copy as unknown as typeof _copy.default;
const json = _json as unknown as typeof _json.default;
const replace = _replace as unknown as typeof _replace.default;
const terser = _terser as unknown as typeof _terser.default;

// Set base values and use an environment variable to distinguish between development v production builds
const isDevelopment = process.env.BUILD === 'debug';
const outputFolder = 'dist';

const options: RollupOptions = {

    input: './src/main.ts',
    output: {

        // Output ECMAScript modules
        dir: outputFolder,
        format: 'esm',
        entryFileNames: 'main.bundle.js',

        // Enable source maps and use correct paths to support debugging
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            return path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
        },
    },

    // Avoid packaging Node.js built-in modules
    external: [
        'electron',
        'electron-store',
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

        // Prevent errors with the ajv module, which imports JSON, which rollup would otherwise interpret as JavaScript
        json(),

        // Use esbuild as an up to date plugin for building typescript code
        esbuild({
            tsconfig: './tsconfig-main.json',
            target: 'es2022',
        }),

        // Set IS_DEBUG to true in development mode
        replace({
            'IS_DEBUG': JSON.stringify(isDevelopment),
            preventAssignment: true,
        }),

        // Copy required files to the dist folder
        copy({
            targets: [
                { src: 'desktop.config.json', dest: outputFolder },
                { src: 'src/preload.js', dest: outputFolder },
                { src: 'package.json', dest: outputFolder },
            ],
        }),

        // Minimize release bundles
        isDevelopment ? [] : [ terser() ]
    ],
};

export default defineConfig(options);
