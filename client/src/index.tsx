import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IFabricExports} from './gotchi/fabric-exports';

declare const createFabricInstance: () => Promise<IFabricExports>; // implementation: index.html

ReactDOM.render(
    <App createFabricInstance={createFabricInstance}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();
