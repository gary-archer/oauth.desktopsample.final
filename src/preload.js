const {ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
 */
window.api = {

    /*
     * Call the main process via ipcRenderer
     */
    sendIpcMessageOneWay(name, requestData) {
        ipcRenderer.send(name, requestData);
    },

    /*
     * Call the main process via ipcRenderer and wait for a response
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