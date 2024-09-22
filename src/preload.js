const {contextBridge, ipcRenderer} = require('electron');

/*
 * Entry points to privileged operations called by the renderer process
 * The preload script must use CommonJS syntax since I also use process sandboxing
 */
contextBridge.exposeInMainWorld('api', {

    /*
     * Send a request from the renderer to the main process and return the response
     */
    sendMessage: async function(name, requestData) {
        return await ipcRenderer.invoke(name, requestData);
    },

    /*
     * Receive a notification from the main process
     */
    receiveMessage: function(name, callback) {

        ipcRenderer.on(name, (event, responseData) => {
            callback(responseData);
        });
    },
});
