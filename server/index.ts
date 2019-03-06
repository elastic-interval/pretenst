import createLnRpc from "@radar/lnrpc"
import { LnRpc } from "@radar/lnrpc/types/lnrpc"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import express from "express"

import { HexalotCurator } from "./src/curator"
import { PaymentHandler } from "./src/payment"
import { LevelDBFlashStore } from "./src/store"


async function run(port: number): Promise<void> {
    dotenv.load()

    const lnRpcHost = process.env.LNRPC_REMOTE_HOST
    let lnRpc: LnRpc
    if (!lnRpcHost) {
        lnRpc = await createLnRpc({
            server: "localhost:10009",
        })
    } else {
        lnRpc = await createLnRpc({
            server: `${lnRpcHost}:10009`,
            tls: `./secret/${lnRpcHost}/tls.cert`,
            macaroonPath: `./secret/${lnRpcHost}/admin.macaroon`,
        })
    }
    const paymentHandler = new PaymentHandler(lnRpc)
    const flashStore = new LevelDBFlashStore(__dirname + "/data/flash-store")
    const curator = new HexalotCurator(flashStore, paymentHandler)

    const app = express()

    app.use(bodyParser())

    app.get("/test", (req, res) => res.end("OK"))

    app.use("/hexalot", curator.createExpressRouter())

    return new Promise<void>(resolve => app.listen(port, resolve))
}

const PORT = 8000
run(PORT)
    .then(() => console.log(`Listening on port ${PORT}`))
