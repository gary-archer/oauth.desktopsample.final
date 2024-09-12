#!/bin/bash

##########################################################################
# A script to run the desktop app
#
# On Windows, ensure that you have first set Git bash as the node.js shell
# - npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
#
# On Ubuntu 24 you may also need to run the command from this thread:
# - https://github.com/electron/electron/issues/42510
# - sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
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
