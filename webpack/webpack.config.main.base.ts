import path from 'path';
import webpack from 'webpack';

const dirname = process.cwd();
const config: webpack.Configuration = {

    // Indicate that we're building for the Electron Main process
    target: ['electron-main'],

    // Always output source maps since we need to decompile bundles
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
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                // Load the result of the keytar native build into the Electron app
                // https://github.com/atom/node-keytar/issues/59
                test: /\.node$/,
                loader: 'node-loader'
            }
        ]
    },
    resolve: {

        // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
        extensions: ['.ts', '.js']
    },
    output: {

        // Output bundles to the dist folder
        path: path.resolve(dirname, './dist'),
        filename: 'main.bundle.js'
    }
};

export default config;
