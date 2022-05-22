#!/bin/bash

##############################################
# A script to build the desktop app and run it
##############################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Download dependencies
#
if [ ! -d 'node_modules' ]; then
  npm install
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered downloading dependencies'
  exit
fi

#
# Build native code used by keytar to store tokens on the device
#
npm run buildnative
if [ $? -ne 0 ]; then
  echo 'Problem encountered building native code'
  exit
fi

#
# Build the code
#
#npm run build
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
# Run the desktop app
#
npm start 2>/dev/null
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi

#
# Prevent automatic terminal closure on Linux
#
if [ "$(uname -s)" == 'Linux' ]; then
  read -n 1
fi