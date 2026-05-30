#!/bin/bash

###############################################################
# A script to produce a release build of the desktop app's code
###############################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the main side of the Electron app
#
echo 'Building main code ...'
NODE_OPTIONS='--import tsx' npx rollup --config build/rollup.main.config.ts --release
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  read -n 1
  exit 1
fi

#
# Build the renderer side of the Electron app
#
echo
echo 'Building renderer code ...'
NODE_OPTIONS='--import tsx' npx rollup --config build/rollup.renderer.config.ts --release
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer side of the desktop app'
  read -n 1
  exit 1
fi

#
# Wait for completion
#
read -n 1
