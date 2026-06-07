#!/bin/bash

###################################################################
# Run a live reload server to support watch mode after code updates
###################################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Start listening
#
npx tsx liveReloadServer.ts
if [ $? -ne 0 ]; then
  read -n 1
  exit 1
fi

#
# Wait for completion
#
read -n 1
