/*
 * Adds support for live reload in development mode
 */

export const ws = new WebSocket('ws://localhost:35729/reload');
ws.onmessage = (event: MessageEvent<string>) => {
    if (event.data === 'reload') {
        location.reload();
    }
};
