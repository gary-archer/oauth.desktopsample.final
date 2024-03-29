const {contextBridge, ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
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
