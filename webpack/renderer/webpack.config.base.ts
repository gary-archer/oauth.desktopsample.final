import path from 'path';
import webpack from 'webpack';

/*
 * Performs tree shaking to avoid deploying main code to renderer bundles
 */
const dirname = process.cwd();
const config: webpack.Configuration = {

    // Build for a web target
    target: ['web'],

    // Always output source maps so that we can decompile bundles
    devtool: 'source-map',

    // Set the working folder
    context: path.resolve(dirname, './src'),

    entry: {
        // Pull in all dependencies starting from the renderer file
        app: ['./renderer.tsx']
    },
    module: {
        rules: [
            {
                // Files with a .ts or .tsx extension are loaded by the Typescript loader
                test: /\.(ts|tsx)$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        onlyCompileBundledFiles: true,
                        configFile: '../tsconfig-renderer.json',
                    },
                }],
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {

        // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
        extensions: ['.ts', '.tsx', '.js']
    },
    output: {

        // Output ECMAScript bundles to the dist folder
        path: path.resolve(dirname, './dist'),
        filename: '[name].bundle.js',
        module: true,
    },
    experiments: {
        outputModule: true,
    },
    optimization: {

        // Indicate that third party code is built to a separate vendor bundle file
        splitChunks: {
            cacheGroups: {
                vendor: {
                    chunks: 'initial',
                    name: 'vendor',
                    test: /node_modules/,
                    enforce: true,
                },
            }
        }
    }
};

export default config;
