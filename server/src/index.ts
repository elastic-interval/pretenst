import * as express from "express"

import hexalotRouter from "./hexalot"

const PORT = 8000

const app = express()

app.get("/test", (req, res) => res.end("OK"))

app.use("/hexalot", hexalotRouter)

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
