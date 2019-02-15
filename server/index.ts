import * as express from 'express';

const app = express();

app.get('/test', (req, res) => res.end("OK"));

app.listen(8000);