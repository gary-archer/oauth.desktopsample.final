import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import {builtinModules} from 'module';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';

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

    // Ignore circular dependency warnings for these modules, that I cannot control
    onwarn(warning: any, warn: any) {
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
            platform: 'node',
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
        ...(isDevelopment ? [] : [ terser() ]),
    ],
};

export default defineConfig(options);
