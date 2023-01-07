import {merge} from 'webpack-merge';
import baseConfig from './webpack.config.renderer.base.mjs';

export default merge(baseConfig, {

  // Let webpack know this is a release build
  mode: 'production',

  // Turn off performance warnings until we have a plan for dealing with them
  performance: {
    hints: false
  }
});