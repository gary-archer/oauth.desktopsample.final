import React from 'react';
import {render} from 'react-dom';
import {HashRouter} from 'react-router-dom';
import {App} from './app/app';
import {AppViewModel} from './app/appViewModel';

/*
 * The Electron renderer process entry point
 */
const props = {
    viewModel: new AppViewModel(),
};
render (
    <HashRouter>
        <App {...props} />
    </HashRouter>,
    document.getElementById('root'),
);
