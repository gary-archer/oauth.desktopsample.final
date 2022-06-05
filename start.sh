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
# Download dependencies
#
if [ ! -d 'node_modules' ]; then
  npm install
  if [ $? -ne 0 ]; then
    echo 'Problem encountered downloading dependencies'
    exit
  fi
fi

#
# Build native code used by keytar to store tokens on the device
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  bash node_modules/.bin/electron-rebuild
else
  node_modules/.bin/electron-rebuild
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered building native code'
  exit
fi

#
# Build the application's Typescript code
#
npm run build
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app'
  exit
fi

#
# If running on Linux then deploy the Gnome .desktop file needed for private URI schemes to work
#
if [ "$(uname -s)" == 'Linux' ]; then

  APP_REGISTRATION_PATH=~/.local/share/applications/finaldesktopapp.desktop
  if [ ! -f "$APP_REGISTRATION_PATH" ]; then

    # Set absolute paths to the Electron executable
    export APP_PATH=$(pwd)
    envsubst < linux/finaldesktopapp.desktop.template > linux/finaldesktopapp.desktop
    
    # Then install the .desktop file
    cp linux/finaldesktopapp.desktop $APP_REGISTRATION_PATH
    xdg-mime default finaldesktopapp.desktop x-scheme-handler/x-mycompany-desktopapp
  fi
fi

#
# Run differently depending on the platform
#
if [ "$PLATFORM" == 'WINDOWS' ]; then
  bash node_modules/.bin/electron ./dist
else
  node_modules/.bin/electron ./dist
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi