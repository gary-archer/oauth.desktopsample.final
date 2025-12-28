import webpack from 'webpack';
import {merge} from 'webpack-merge';
import baseConfig from './webpack.config.base';

const devConfig: webpack.Configuration = {

    // Let webpack know this is a debug build
    mode: 'development',

    // Enable stepping through frontend TypeScript code in the Visual Studio Code debugger
    output: Object.assign({}, baseConfig.output, {
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    }),

    // Let the code know it runs in debug mode
    plugins:[
        new webpack.DefinePlugin({
            IS_DEBUG: 'true',
        }),
    ]
};

export default merge(baseConfig, devConfig);
