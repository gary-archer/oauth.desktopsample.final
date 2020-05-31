const {ipcRenderer} = require('electron');

/*
 * Privileged operations called by the renderer process
 */
window.api = {

    /*
     * Call the main process via ipcRenderer and wait for a response
     */
    async sendIpcMessageAndGetResponse(name, args) {

        return new Promise((resolve, reject) => {
            ipcRenderer.send(name, {});
            ipcRenderer.on(name, (event, data) => {
                resolve(data)
            });
        });
    }
};