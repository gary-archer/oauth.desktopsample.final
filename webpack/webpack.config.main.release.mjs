import {merge} from 'webpack-merge';
import {removeSourceMapReferences} from './rewriteSourceMaps.mjs'
import baseConfig from './webpack.config.main.base.mjs';

export default merge(baseConfig, {

  // Let webpack know this is a release build
  mode: 'production',

  // Turn off performance warnings until we have a plan for dealing with them
  performance: {
    hints: false
  },

  plugins:[
    {
      // In release builds, remove source map references
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
          removeSourceMapReferences(['main.bundle.js']);
        });
      }
    }
  ]
});