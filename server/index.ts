import * as express from 'express';

const PORT = 8000;

const app = express();

app.get('/test', (req, res) => res.end("OK"));

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
