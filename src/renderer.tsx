import React, {StrictMode} from 'react';
import ReactDOM from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import {App} from './app/app';
import {AppViewModel} from './app/appViewModel';
import {ErrorBoundary} from './views/errors/errorBoundary';

/*
 * The Electron renderer process entry point
 */
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const props = {
    viewModel: new AppViewModel(),
};
root.render (
    <StrictMode>
        <ErrorBoundary>
            <HashRouter>
                <App {...props} />
            </HashRouter>
        </ErrorBoundary>
    </StrictMode>
);
