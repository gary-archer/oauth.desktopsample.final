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
# Download dependencies
#
npm install
if [ $? -ne 0 ]; then
  echo 'Problem encountered downloading dependencies'
  exit
fi

#
# Copy deployable assets that are not Javascript bundles
#
rm -rf dist 2>/dev/null
mkdir dist
cp index.html desktop.config.json css/* package.json src/preload.js dist

#
# Make code quality checks
#
npm run lint
if [ $? -ne 0 ]; then
  echo 'Code quality checks failed'
  exit 1
fi

#
# Build the code in watch mode
#
echo 'Building application bundles ...'
if [ "$PLATFORM" == 'MACOS' ]; then

  open -a Terminal ./buildDebug.sh

elif [ "$PLATFORM" == 'WINDOWS' ]; then
  
  GIT_BASH="C:\Program Files\Git\git-bash.exe"
  "$GIT_BASH" -c ./buildDebug.sh &

elif [ "$PLATFORM" == 'LINUX' ]; then

  gnome-terminal -- ./buildDebug.sh
fi

#
# Wait for built bundles to become available
#
while [ ! -f ./dist/app.bundle.js ]; do
  sleep 1
done

#
# Post build behaviors for Linux desktop applications
#  
if [ "$PLATFORM" == 'LINUX' ]; then
  
  #
  # Register the application's private URI scheme with the operating system
  #
  export APP_COMMAND="npx electron $(pwd)/dist"
  ./linux/register.sh

  #
  # Enter a password to work around this Electron issue:
  # - https://github.com/electron/electron/issues/42510
  #
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
fi

#
# Run the Electron app
#
npx electron ./dist
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
