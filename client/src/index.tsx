import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';
import {IFabric} from './fabric';

declare const fabricFactory: () => Promise<IFabric>; // implementation: index.html

ReactDOM.render(
    <App fabricFactory={fabricFactory}/>,
    document.getElementById('root') as HTMLElement
);
registerServiceWorker();
