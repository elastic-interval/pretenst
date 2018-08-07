import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';
import registerServiceWorker from './service-worker';

export interface IEigWasm {
    summa: (a: number, b: number) => number;
}

declare const eigWasmPromise: Promise<IEigWasm>;

eigWasmPromise.then((eigWasm: IEigWasm) => {
    ReactDOM.render(
        <App eigWasm={eigWasm}/>,
        document.getElementById('root') as HTMLElement
    );
    registerServiceWorker();
});


