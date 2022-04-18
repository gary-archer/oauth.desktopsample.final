import React from 'react';
import {render} from 'react-dom';
import {HashRouter} from 'react-router-dom';
import {App} from './app/app';
import {AppViewModel} from './app/appViewModel';
import {ErrorBoundary} from './views/errors/errorBoundary';

/*
 * The Electron renderer process entry point
 */
const props = {
    viewModel: new AppViewModel(),
};
render (
    <ErrorBoundary>
        <HashRouter>
            <App {...props} />
        </HashRouter>
    </ErrorBoundary>,
    document.getElementById('root'),
);
