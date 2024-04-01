const {contextBridge, ipcRenderer} = require('electron');

/*
 * The preload script provides entry points to privileged operations called by the renderer process
 * CommonJS is used for the preload script so that that process sandboxing can also be enabled
 * 
 */
contextBridge.exposeInMainWorld('api', {

    /*
     * Push a command from the renderer to the main process and wait for a response
     */
    sendIpcMessage: async function(name, requestData) {

        return new Promise((resolve) => {

            ipcRenderer.send(name, requestData);
            ipcRenderer.on(name, (event, responseData) => {
                resolve(responseData);
            });
        });
    },

    /*
     * Pull data from the main process
     */
    receiveIpcMessage: function(name, callback) {

        ipcRenderer.on(name, (event, responseData) => {
            callback(responseData);
        });
    },
});
