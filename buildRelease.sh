#!/bin/bash

###############################################################
# A script to produce a release build of the desktop app's code
###############################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the main side of the Electron app
#
echo 'Building main code ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/main/webpack.config.prod.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  exit 1
fi

#
# Build the renderer side of the Electron app in watch mode
#
echo
echo 'Building renderer code ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/renderer/webpack.config.prod.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer side of the desktop app'
  exit 1
fi
