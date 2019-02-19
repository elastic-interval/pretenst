import * as express from "express"

import hexalotRoutes from "./hexalotRoutes"

const PORT = 8000

const app = express()

app.get("/test", (req, res) => res.end("OK"))

app.use("/hexalot", hexalotRoutes)

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
