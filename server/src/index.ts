import createLnRpc from "@radar/lnrpc"
import bodyParser = require("body-parser")
import * as express from "express"

import { HexalotCurator } from "./curator"
import { PaymentHandler } from "./payment"
import { InMemoryStore } from "./store"


async function run(port: number): Promise<void> {
    const lnRpc = await createLnRpc({
        server: process.env.LNRPC_HOST || "localhost:10009",
        tls: "secret/tls.cert",
        macaroonPath: "secret/invoice.macaroon",
    })
    const paymentHandler = new PaymentHandler(lnRpc)
    const curator = new HexalotCurator(new InMemoryStore(), paymentHandler)

    const app = express()

    app.use(bodyParser())

    app.get("/test", (req, res) => res.end("OK"))

    app.use("/hexalot", curator.createExpressRouter())

    return new Promise(resolve => app.listen(port, resolve))
}

const PORT = 8000
run(PORT)
    .then(() => console.log(`Listening on port ${PORT}`))
