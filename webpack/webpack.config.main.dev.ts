import webpack from 'webpack';
import {merge} from 'webpack-merge';
import baseConfig from './webpack.config.main.base';

const devConfig: webpack.Configuration = {

    // Let webpack know this is a debug build
    mode: 'development',
};

export default merge(baseConfig, devConfig);
