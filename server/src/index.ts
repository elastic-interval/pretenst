import bodyParser = require("body-parser")
import * as express from "express"

import {HexalotCurator} from "./curator"
import { PaymentHandler } from "./payment"
import { InMemoryStore } from "./store"

const PORT = 8000

const app = express()

app.use(bodyParser())

app.get("/test", (req, res) => res.end("OK"))

const paymentHandler = new PaymentHandler() // TODO: pass LN connection information
const curator = new HexalotCurator(new InMemoryStore(), paymentHandler)
app.use("/hexalot", curator.createExpressRouter())

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
