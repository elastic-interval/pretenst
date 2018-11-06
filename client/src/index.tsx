import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IFabricExports} from './body/fabric-exports';
import {AppStorage} from './app-storage';

declare const createFabricInstance: () => Promise<IFabricExports>; // implementation: index.html
const storage: AppStorage = new AppStorage(localStorage);

ReactDOM.render(
    <App createFabricInstance={createFabricInstance} storage={storage}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();
