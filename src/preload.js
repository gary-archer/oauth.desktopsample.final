const {ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
 */
window.api = {

    /*
     * Call the main process via ipcRenderer
     */
    sendIpcMessageOneWay(name, args) {
        ipcRenderer.send(name, args);
    },

    /*
     * Call the main process via ipcRenderer and wait for a response
     */
    async sendIpcMessageRequestReply(name, args) {

        return new Promise((resolve, reject) => {
            ipcRenderer.send(name, args);
            ipcRenderer.on(name, (event, data) => {
                resolve(data)
            });
        });
    }
};