#!/bin/bash

##############################################
# A script to build the desktop app and run it
##############################################

cd "$(dirname "${BASH_SOURCE[0]}")"

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
# Build the application's Typescript code
#
./build.sh 'debug'
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app'
  exit
fi

#
# Register the app to use the Electron command to run the built files in the dist folder
#
if [ "$PLATFORM" == 'LINUX' ]; then
  export APP_COMMAND="$(pwd)/node_modules/.bin/electron $(pwd)/dist"
  ./linux/register.sh
fi

#
# Run the Electron app
#
./node_modules/.bin/electron ./dist
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
