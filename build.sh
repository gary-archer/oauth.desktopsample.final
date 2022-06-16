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
# Build native code used by keytar to store tokens on the device
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  ./node_modules/.bin/electron-rebuild.cmd
else
  ./node_modules/.bin/electron-rebuild
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered building native code'
  exit 1
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

#
# Build the main side of the Electron app
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  ./node_modules/.bin/webpack.cmd --config "webpack/webpack.config.main.$CONFIGURATION.js"
else
  ./node_modules/.bin/webpack --config "webpack/webpack.config.main.$CONFIGURATION.js"
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main side of the desktop app'
  exit 1
fi

#
# Build the renderer side of the Electron app
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  ./node_modules/.bin/webpack.cmd --config "webpack/webpack.config.renderer.$CONFIGURATION.js"
else
  ./node_modules/.bin/webpack --config "webpack/webpack.config.renderer.$CONFIGURATION.js"
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer side of the desktop app'
  exit 1
fi
