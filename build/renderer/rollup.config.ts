import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import tailwind from '@tailwindcss/postcss';
import cssnano from 'cssnano';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import {notifyBrowser} from './plugins/developmentPlugins.js';
import {finalizeBundles} from './plugins/productionPlugins.js';

// Set base values and use an environment variable to distinguish between development v production builds
const isDevelopment = process.env.BUILD === 'debug';
const outputFolder = 'dist';

const options: RollupOptions = {

    input: './src/renderer.tsx',
    output: {

        // Output ECMAScript modules
        dir: outputFolder,
        format: 'esm',

        // Define chunks names for the entry point app chunk, and any initial chunks referenced in index.html
        entryFileNames: 'app.bundle.js',
        chunkFileNames: '[name].bundle.js',
        manualChunks: (id: string) => {

            if (!id.includes('node_modules')) {
                return null;
            }

            if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
                return 'react';
            }

            return 'vendor';
        },

        // Enable source maps and use correct paths to support debugging
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath: string, sourcemapPath: string) => {
            return path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
        },
    },

    watch: {
        clearScreen: false,
    },

    // Ignore this React warning
    onwarn(warning: any, warn: any) {

        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
            return;
        }

        warn(warning);
    },

    plugins: [

        // Use browser resolution for node_modules
        nodeResolve({
            browser: true,
        }),

        // Convert any commonjs libraries from the node_modules folder to ECMAScript
        commonjs(),

        // Use esbuild as an up to date plugin for building typescript code
        esbuild({
            tsconfig: './tsconfig.json',
            target: 'es2020',
            jsx: 'automatic',
        }),

        // React requires the NODE_ENV value and we set IS_DEBUG to true in development mode
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            'IS_DEBUG': JSON.stringify(isDevelopment),
            preventAssignment: true,
        }),

        // Copy these static files to the output folder when a build completes
        copy({
            targets: [
                { src: 'index.html', dest: outputFolder },
            ],
        }),

        ...(isDevelopment ? [

            // Build development CSS
            postcss({
                extract: 'app.css',
                plugins: [
                    tailwind(),
                ]
            }),

            // Implement live reload
            notifyBrowser(),

        ] : [

            // Build production CSS
            postcss({
                extract: 'app.css',
                plugins: [
                    tailwind(),
                    cssnano(),
                ]
            }),

            // Minimize release bundles and remove source map references from them
            terser(),
            finalizeBundles(),
        ]),
    ],
};

export default defineConfig(options);
