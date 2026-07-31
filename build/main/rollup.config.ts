import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import {builtinModules} from 'module';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import {copyFiles} from '../plugins.js';

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
        sourcemapPathTransform: (relativeSourcePath: string, sourcemapPath: string) => {
            return path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
        },
    },

    // Avoid packaging artifacts that rollup or the commonjs plugin may process incorrectly
    // The output app.asar package includes a main.bundle.js and a node_modules folder with production dependencies
    // Therefore, the desktop app can correctly resolve externals from production dependencies
    external: [
        'electron',
        'electron-store',
        'undici',
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

        // Convert any commonjs libraries from the node_modules folder to ECMAScript
        commonjs(),

        // Prevent errors with the ajv module, which imports JSON, which rollup would otherwise interpret as JavaScript
        json(),

        // Set IS_DEBUG to true in development mode
        replace({
            'IS_DEBUG': JSON.stringify(isDevelopment),
            preventAssignment: true,
        }),

        // Use esbuild as an up to date plugin for building typescript code
        esbuild({
            tsconfig: './tsconfig-main.json',
            target: 'es2022',
            platform: 'node',
        }),

        // Copy required files to the dist folder
        copyFiles(outputFolder, [
            'desktop.config.json',
            'src/preload.js',
            'package.json',
        ]),

        // Minimize release bundles
        ...(isDevelopment ? [] : [ terser() ]),
    ],
};

export default defineConfig(options);
