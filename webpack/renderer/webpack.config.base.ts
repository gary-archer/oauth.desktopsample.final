import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import webpack, {Module, NormalModule} from 'webpack';

/*
 * Performs tree shaking to avoid deploying main code to renderer bundles
 */
const dirname = process.cwd();
const config: webpack.Configuration = {

    // Build for a web target
    target: 'web',

    // Always output source maps so that we can decompile bundles
    devtool: 'source-map',

    // Set the working folder
    context: path.resolve(dirname, '.'),

    entry: {
        // Pull in all dependencies starting from the renderer file
        app: './src/renderer.tsx',
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

        // Build third party code into two bundles, for React and non-React code
        // Using a function works for both the webpack dev server and release builds
        splitChunks: {
            cacheGroups: {
                react: {
                    name: 'react',
                    chunks: 'all',
                    test: (module: Module) => {

                        if (!(module instanceof NormalModule)) {
                            return false;
                        }

                        if (module.resource.indexOf('node_modules') !== -1 && module.resource.indexOf('react') !== -1) {
                            return true;
                        }

                        return false;
                    },
                },
                vendor: {
                    name: 'vendor',
                    chunks: 'all',
                    test: (module: Module) => {

                        if (!(module instanceof NormalModule)) {
                            return false;
                        }

                        if (module.resource.indexOf('node_modules') !== -1 && module.resource.indexOf('react') === -1) {
                            return true;
                        }

                        return false;
                    },
                }
            }
        }
    },
    plugins: [

        // Copy static files to the dist folder
        new CopyPlugin({
            patterns: [
                {
                    from: 'index.html',
                    to: path.resolve('dist'),
                },
                {
                    from: 'css',
                    to: path.resolve('dist'),
                },
            ]
        }),
    ]
};

export default config;
