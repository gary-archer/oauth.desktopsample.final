const path = require('path');

module.exports = {

  // Do a standard web build for modern browsers
  target: ['web', 'es2017'],

  // Set the working folder
  context: path.resolve(__dirname, '../src'),

  entry: {
    // Pull in all dependencies starting from the renderer file
    app: ['./renderer.tsx']
  },
  module: {
    rules: [
      {
        // Files with a .ts extension are loaded by the Typescript loader
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    
    // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
    extensions: ['.ts', '.tsx', '.js']
  },
  output: {
    
    // Output bundles to the dist folder
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].bundle.js'
  },
  optimization: {

    // Indicate that third party code is built to a separate vendor bundle file
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: 'initial',
          name: 'vendor',
          test: /node_modules/,
          enforce: true
        },
      }
    }
  }
}
