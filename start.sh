#!/bin/bash

##########################################################################
# A script to run the desktop app in development mode
#
# On Windows, ensure that you have first set Git bash as the node.js shell
# - npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
##########################################################################

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
# Build the application's Typescript code in debug mode
#
./build.sh
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app code'
  exit
fi

#
# On Linux, register the app to use the Electron command to run the built files in the dist folder
#  
if [ "$PLATFORM" == 'LINUX' ]; then
  
  export APP_COMMAND="npx electron $(pwd)/dist"
  ./linux/register.sh
fi

#
# Run the Electron app
#
npx electron ./dist
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
