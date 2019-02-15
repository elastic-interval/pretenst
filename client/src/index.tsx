import 'bootstrap/dist/css/bootstrap.min.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './app';
import {AppStorage} from './app-storage';
import {IFabricExports} from './body/fabric-exports';
import './index.css';
import registerServiceWorker from './service-worker';

declare const createFabricInstance: (fabricNumber: any) => Promise<IFabricExports>; // implementation: index.html
const storage: AppStorage = new AppStorage(localStorage);

ReactDOM.render(
    <App createFabricInstance={createFabricInstance} storage={storage}/>,
    document.getElementById('root') as HTMLElement,
);
registerServiceWorker();
