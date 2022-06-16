#!/bin/bash

###################################################################
# A script to package the desktop app into an executable and run it
###################################################################

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
# Build the application's Typescript code in release mode
#
./build.sh release
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app code'
  exit
fi

#
# Package the app
#
if [ -d 'package' ]; then
  rm -rf package
fi
if [ "$PLATFORM" == 'WINDOWS' ]; then
  ./node_modules/.bin/electron-packager.cmd ./dist --out=package
else
  ./node_modules/.bin/electron-packager ./dist --out=package
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered packaging the desktop app'
  exit
fi

#
# Run the app
#
if [ "$PLATFORM" == 'MACOS' ]; then
  
  open ./package/finaldesktopapp-darwin-x64/finaldesktopapp.app

elif [ "$PLATFORM" == 'WINDOWS' ]; then

  echo 'Running Windows app'

elif [ "$PLATFORM" == 'LINUX' ]; then

  echo 'Running Linux app'
fi
