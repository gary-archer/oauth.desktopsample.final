import path from 'path';
import webpack from 'webpack';

/*
 * Performs tree shaking to avoid deploying renderer code to main bundles
 */
const dirname = process.cwd();
const config: webpack.Configuration = {

    // Build for a node.js target
    target: ['electron-main'],

    // Always output source maps so that we can decompile bundles
    devtool: 'source-map',

    // Set the working folder
    context: path.resolve(dirname, './src'),

    entry: {
        // Pull in all dependencies starting from the main file
        app: ['./main.ts']
    },
    module: {
        rules: [
            {
                // Files with a .ts extension are loaded by the Typescript loader
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        onlyCompileBundledFiles: true,
                        configFile: '../tsconfig-main.json',
                    },
                }],
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {

        // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
        extensions: ['.ts', '.js']
    },
    output: {

        // For the main build, using ESM modules prevents CommonJS output
        path: path.resolve(dirname, './dist'),
        filename: 'main.bundle.js',
        module: true,
    },
    experiments: {
        outputModule: true,
    },
};

export default config;
