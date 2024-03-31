import path from 'path';
import webpack from 'webpack';

/*
 * Performs tree shaking to avoid deploying redundant code to the main side of the app
 * This excludes code from the renderer side of the app from main bundles
 * Electron since version 28 supports building to ECMAScript modules
 * Yet currently the webpack electron-main target only supports CommonJS bundle output
 */
const dirname = process.cwd();
const config: webpack.Configuration = {

    // Build for electron main output
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
                use: [{
                    loader: 'ts-loader',
                    options: {
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

        // Output bundles to the dist folder
        path: path.resolve(dirname, './dist'),
        filename: 'main.bundle.js'
    }
};

export default config;
