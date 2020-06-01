const {ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
 */
window.api = {

    /*
     * Send an instruction to the main process via ipcRenderer
     */
    sendIpcMessageOneWay(name, requestData) {

        ipcRenderer.send(name, requestData);
    },

    /*
     * Receive data from the main process via ipcRenderer
     */
    receiveIpcMessageOneWay(name, callback) {
        
        ipcRenderer.on(name, (event, responseData) => {
            callback(responseData)
        });
    },

    /*
     * Send an instruction to the main process via ipcRenderer and wait for a response
     */
    async sendIpcMessageRequestReply(name, requestData) {

        return new Promise((resolve, reject) => {
            ipcRenderer.send(name, requestData);
            ipcRenderer.on(name, (event, responseData) => {
                resolve(responseData)
            });
        });
    }
};