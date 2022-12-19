####################################################################
# A script to register the desktop app with the Gnome desktop system
####################################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Delete existing if required
#
APP_REGISTRATION_PATH=~/.local/share/applications/finaldesktopapp.desktop
if [ -f "$APP_REGISTRATION_PATH" ]; then
  rm  "$APP_REGISTRATION_PATH"
fi

#
# Set the executable command
#
envsubst < finaldesktopapp.desktop.template > finaldesktopapp.desktop

#
# Then deploy the Gnome .desktop file needed for private URI schemes to work
#
cp finaldesktopapp.desktop $APP_REGISTRATION_PATH
xdg-mime default finaldesktopapp.desktop x-scheme-handler/x-mycompany-desktopapp
