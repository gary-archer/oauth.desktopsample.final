#!/bin/bash

##########################################
# A script to build the desktop app's code
##########################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Use a debug configuration by default
#
CONFIGURATION="$1"
if [ "$CONFIGURATION" != 'release' ]; then
  CONFIGURATION='debug'
fi

#
# Get the platform
#
case "$(uname -s)" in

  Darwin)
    PLATFORM="MACOS"
 	;;

  MINGW64*)
    PLATFORM="WINDOWS"
	;;

  Linux)
    PLATFORM="LINUX"
	;;
esac

#
# Download dependencies
#
if [ ! -d 'node_modules' ]; then
  npm install
  if [ $? -ne 0 ]; then
    echo 'Problem encountered downloading dependencies'
    exit 1
  fi
fi

#
# Copy deployable assets that are not Javascript bundles
#
if [ -d 'dist' ]; then
  rm -rf dist
fi
mkdir dist
cp index.html desktop*.json *.css package.json src/preload.js dist

#
# Make code quality checks
#
npm run lint
if [ $? -ne 0 ]; then
  echo 'Code quality checks failed'
  exit 1
fi

if [ "$CONFIGURATION" == 'release' ]; then

  #
  # Build the main side of the Electron app
  #
  npm run webpackMainRelease
  if [ $? -ne 0 ]; then
    echo 'Problem encountered building the main side of the desktop app'
    exit 1
  fi

  #
  # Build the renderer side of the Electron app
  #
  npm run webpackRendererRelease
  if [ $? -ne 0 ]; then
    echo 'Problem encountered building the renderer side of the desktop app'
    exit 1
  fi

else

  #
  # Build the main side of the Electron app
  #
  npm run webpackMainDebug
  if [ $? -ne 0 ]; then
    echo 'Problem encountered building the main side of the desktop app'
    exit 1
  fi

  #
  # Build the renderer side of the Electron app in watch mode
  #
  npm run webpackRendererDebug
  if [ $? -ne 0 ]; then
    echo 'Problem encountered building the renderer side of the desktop app'
    exit 1
  fi

fi
