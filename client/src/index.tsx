import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import 'bootstrap/dist/css/bootstrap.min.css';
import registerServiceWorker from './service-worker';
import {IFabricExports} from './body/fabric-exports';
import {AppStorage} from './app-storage';
import './index.css';

declare const createFabricInstance: () => Promise<IFabricExports>; // implementation: index.html
const storage: AppStorage = new AppStorage(localStorage);

ReactDOM.render(
    <App createFabricInstance={createFabricInstance} storage={storage}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();
