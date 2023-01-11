import {merge} from 'webpack-merge';
import baseConfig from './webpack.config.main.base.mjs';

export default merge(baseConfig, {

  // Let webpack know this is a debug build
  mode: 'development',
});