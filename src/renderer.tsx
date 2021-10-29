import React from 'react';
import {render} from 'react-dom';
import {App} from './app/app';
import {AppViewModel} from './app/appViewModel';

/*
 * The Electron renderer process entry point
 */
const props = {
    viewModel: new AppViewModel(),
};
render (
    <App {...props} />,
    document.getElementById('root'),
);
