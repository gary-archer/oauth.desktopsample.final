import {spawn} from 'child_process';

/*
 * Run the rollup bundler to build the renderer side of the app
 */
console.log('Running rollup renderer build ...');
const rollupRenderer = spawn(
    'rollup',
    ['--config', 'build/renderer/rollup.config.ts', '--watch'],
    {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: {
            ...process.env,
            NODE_OPTIONS: '--import tsx',
            BUILD: 'debug',
        },
    }
);

/*
 * Run a live reload server to notify the renderer process when code changes
 */
console.log('Running live reload server ...');
const server = spawn(
    'tsx',
    ['tools/liveReloadServer.ts'],
    {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    }
);

/*
 * Handle shutdown
 */
function shutdown() {
    rollupRenderer.kill();
    server.kill();
    process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
