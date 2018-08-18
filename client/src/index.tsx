import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IFabricExports} from './fabric';

declare const createFabric: () => Promise<IFabricExports>; // implementation: index.html

ReactDOM.render(
    <App createFabric={createFabric}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();
