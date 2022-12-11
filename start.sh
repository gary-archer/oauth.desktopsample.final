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
./build.sh
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app'
  exit
fi

#
# If running on Linux then register the app with the Gnome desktop system
#
if [ "$PLATFORM" == 'LINUX' ]; then
  ./linux/register.sh
fi

#
# Run the Electron app
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  bash ./node_modules/.bin/electron ./dist
else
  ./node_modules/.bin/electron ./dist
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
