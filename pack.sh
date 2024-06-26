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
./build.sh 'release'
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app code'
  exit
fi

#
# Source map files could be used enable exception source line lookup
# This code sample just deletes them, to prevent packaging them
#
rm dist/*.js.map

#
# Package the app
#
if [ -d 'package' ]; then
  rm -rf package
fi
npx electron-packager ./dist --out=package
if [ $? -ne 0 ]; then
  echo 'Problem encountered packaging the desktop app'
  exit
fi

if [ "$PLATFORM" == 'LINUX' ]; then
  
  #
  # Register the app to use the packed command
  #
  export APP_COMMAND="$(pwd)/package/finaldesktopapp-linux-x64/finaldesktopapp"
  ./linux/register.sh

  #
  # On my Ubuntu 24 system I also need to run these commands
  # https://github.com/electron/electron/issues/17972
  #
  sudo chown root package/finaldesktopapp-linux-x64/chrome-sandbox
  sudo chmod 4755 package/finaldesktopapp-linux-x64/chrome-sandbox
fi

#
# Run the app
#
if [ "$PLATFORM" == 'MACOS' ]; then
  
  open ./package/finaldesktopapp-darwin-x64/finaldesktopapp.app

elif [ "$PLATFORM" == 'WINDOWS' ]; then

  start ./package/finaldesktopapp-win32-x64/finaldesktopapp.exe

elif [ "$PLATFORM" == 'LINUX' ]; then

  ./package/finaldesktopapp-linux-x64/finaldesktopapp
fi
