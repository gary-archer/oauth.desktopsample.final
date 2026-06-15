#!/bin/bash

#############################################################
# A script to produce a debug build of the desktop app's code
#############################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Prepare the dist folder
#
rm -rf dist 2>/dev/null
mkdir dist

#
# Build the main side of the Electron app
#
echo 'Running rollup main build ...'
NODE_OPTIONS='--import tsx' BUILD='debug' npx rollup --config build/main/rollup.config.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  read -n 1
  exit 1
fi

#
# Build renderer code and run a live reload server as child processes
#
npx tsx tools/buildRenderer.ts
if [ $? -ne 0 ]; then
  read -n 1
  exit 1
fi

#
# Wait for completion
#
read -n 1
