"use strict";
exports.__esModule = true;
/*
 * Event messages sent between Electron's main and renderer processes
 */
var CustomSchemeEvents = /** @class */ (function () {
    function CustomSchemeEvents() {
    }
    // The main process is called at startup to see if there is a deep link startup URL
    CustomSchemeEvents.ON_GET_CUSTOM_SCHEME_STARTUP_URL = 'get_startup_url';
    // The main process calls the renderer process to deliver custom scheme notifications
    CustomSchemeEvents.ON_CUSTOM_SCHEME_URL_NOTIFICATION = 'custom_scheme_url_notification';
    return CustomSchemeEvents;
}());
exports.CustomSchemeEvents = CustomSchemeEvents;
