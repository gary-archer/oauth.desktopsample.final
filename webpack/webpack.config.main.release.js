const {merge} = require('webpack-merge');
const baseConfig = require('./webpack.config.main.base.js');

module.exports = merge(baseConfig, {

  // Let webpack know this is a release build
  mode: 'production',

  // Turn off performance warnings until we have a plan for dealing with them
  performance: {
    hints: false
  }
});