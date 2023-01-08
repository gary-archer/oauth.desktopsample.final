import webpack from 'webpack';
import {merge} from 'webpack-merge';
import baseConfig from './webpack.config.renderer.base.mjs';

export default merge(baseConfig, {

  // Let webpack know this is a debug build
  mode: 'development',

  // This setting enables us to step through our TypeScript in Visual Studio Code
  output: Object.assign({}, baseConfig.output, {
    devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
  }),
  
  // Pass a variable through to our Web UI to tell it to display stack traces
  plugins:[
    new webpack.DefinePlugin({
      SHOW_STACK_TRACE: 'true',
    })
  ]
});