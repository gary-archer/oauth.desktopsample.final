#!/bin/bash

##########################################################################
# A script to package the desktop app into a release executable and run it
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
# Download dependencies
#
npm install
if [ $? -ne 0 ]; then
  echo 'Problem encountered downloading dependencies'
  exit
fi

#
# Make code quality checks
#
npm run lint
if [ $? -ne 0 ]; then
  echo 'Code quality checks failed'
  exit 1
fi

#
# Prepare the dist folder
#
rm -rf dist 2>/dev/null
mkdir dist

#
# Build the code in watch mode
#
echo 'Building application bundles ...'
if [ "$PLATFORM" == 'MACOS' ]; then

  open -a Terminal ./buildRelease.sh

elif [ "$PLATFORM" == 'WINDOWS' ]; then
  
  GIT_BASH="C:\Program Files\Git\git-bash.exe"
  "$GIT_BASH" -c ./buildRelease.sh &

elif [ "$PLATFORM" == 'LINUX' ]; then

  gnome-terminal -- ./buildRelease.sh
fi

#
# Wait for built bundles to become available
#
while [ ! -f ./dist/app.bundle.js ]; do
  sleep 1
done

#
# We build source map files that could be backed up for later exception diagnosis
# This code sample just deletes the source map files to avoid packaging them
#
rm dist/*.js.map

#
# Package the app
#
rm -rf package 2>/dev/null
npx electron-packager ./dist --out=package
if [ $? -ne 0 ]; then
  echo 'Problem encountered packaging the desktop app'
  exit
fi


#
# Post build behaviors for Linux desktop applications
#  
if [ "$PLATFORM" == 'LINUX' ]; then
  
  #
  # Register the application's private URI scheme with the operating system
  #
  export APP_COMMAND="$(pwd)/package/finaldesktopapp-linux-x64/finaldesktopapp"
  ./linux/register.sh

  #
  # Enter a password to work around this Electron issue:
  # - https://github.com/electron/electron/issues/42510
  #
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
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
