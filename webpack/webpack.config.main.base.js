const path = require('path');

module.exports = {

  // Indicate that we're building for the Electron Main process
  target: 'electron-main',
  
  // Set the working folder
  context: path.resolve(__dirname, '../src'),

  entry: {
    // Pull in all dependencies starting from the main file
    app: ['./main.ts']
  },
  module: {
    rules: [
      {
        // Files with a .ts extension are loaded by the Typescript loader
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    
    // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
    extensions: ['.ts', '.js']
  },
  output: {
    
    // Output bundles to the dist folder
    path: path.resolve(__dirname, '../dist'),
    filename: 'main.bundle.js'
  }
}
