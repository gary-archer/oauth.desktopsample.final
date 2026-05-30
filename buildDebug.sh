#!/bin/bash

#############################################################
# A script to produce a debug build of the desktop app's code
#############################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the main side of the Electron app
#
echo 'Building main code ...'
NODE_OPTIONS='--import tsx' BUILD=debug npx rollup --config build/rollup.main.config.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  read -n 1
  exit 1
fi

echo 'Quit early'
exit 1

#
# Build the renderer side of the Electron app in watch mode
#
echo
echo 'Building renderer code in watch mode ...'
NODE_OPTIONS='--import tsx' BUILD=release npx rollup --config build/rollup.renderer.config.ts --watch
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer side of the desktop app'
  read -n 1
  exit 1
fi

#
# Wait for completion
#
read -n 1