import webpack from 'webpack';
import {merge} from 'webpack-merge';
import {removeSourceMapReferences} from '../rewriteSourceMaps';
import baseConfig from './webpack.config.base';

const prodConfig: webpack.Configuration =
{
    // Let webpack know this is a release build
    mode: 'production',

    // Turn off performance warnings until we have a plan for dealing with them
    performance: {
        hints: false
    },

    plugins:[
        {
            // In release builds, remove source map references
            apply: (compiler: any) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                    removeSourceMapReferences(['main.bundle.js']);
                });
            }
        },

        // Let the code know it runs in release mode
        new webpack.DefinePlugin({
            IS_DEBUG: 'false',
        })
    ]
};

export default merge(baseConfig, prodConfig);