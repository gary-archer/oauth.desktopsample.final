#!/bin/bash

#############################################################
# A script to produce a debug build of the desktop app's code
#############################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the main side of the Electron app
#
echo 'Building main code ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/main/webpack.config.dev.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  exit 1
fi

#
# Change this to 'npm run webpackRendererDebugWatch' when you want to develop in watch mode
#
echo
echo 'Building renderer code in watch mode ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/renderer/webpack.config.dev.ts --watch
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer side of the desktop app'
  exit 1
fi
