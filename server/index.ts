import createLnRpc from "@radar/lnrpc"
import bodyParser = require("body-parser")
import express from "express"

import { HexalotCurator } from "./src/curator"
import { PaymentHandler } from "./src/payment"
import { InMemoryStore } from "./src/store"


async function run(port: number): Promise<void> {
    const lnRpc = await createLnRpc({
        server: "localhost:10009",
    })
    const paymentHandler = new PaymentHandler(lnRpc)
    const curator = new HexalotCurator(new InMemoryStore(), paymentHandler)

    const app = express()

    app.use(bodyParser())

    app.get("/test", (req, res) => res.end("OK"))

    app.use("/hexalot", curator.createExpressRouter())

    return new Promise<void>(resolve => app.listen(port, resolve))
}

const PORT = 8000
run(PORT)
    .then(() => console.log(`Listening on port ${PORT}`))
