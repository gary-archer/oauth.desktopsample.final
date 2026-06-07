import express, {Request, Response} from 'express';
import http from 'http';
import {WebSocketServer, WebSocket} from 'ws';

/*
 * Create the Express host, to listen on the standard live reload port
 */
const port = 35729;
const app = express();

/*
 * Create the HTTP server and a web socket on the same port
 */
const server = http.createServer(app);
const wss = new WebSocketServer({
    server,
    path: '/reload'
});

/*
 * Add a reload endpoint that rollup builds call, which notifies the renderer process to reload itself
 */
app.get('/reload', (request: Request, response: Response) => {

    console.log('Web socket server broadcasting reload event ...');
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send('reload');
        }
    }
    response.sendStatus(204);
});

/*
 * Start listening
 */
server.listen(port, () => {
    console.log(`Live reload server is listening on HTTP port ${port} ...`);
});
