const {ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
 */
window.api = {

    /*
     * Send a command to the main process and wait for a response
     */
    async sendIpcMessage(name, requestData) {

        return new Promise((resolve, reject) => {
            
            ipcRenderer.send(name, requestData);
            ipcRenderer.on(name, (event, responseData) => {
                resolve(responseData)
            });
        });
    },

    /*
     * Receive data from the main process
     */
    receiveIpcMessage(name, callback) {
        
        ipcRenderer.on(name, (event, responseData) => {
            callback(responseData)
        });
    }
};