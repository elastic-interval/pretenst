import createLnRpc, { LnRpcClientConfig } from "@radar/lnrpc"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import express from "express"
import {resolve} from "path"

import { HexalotCurator } from "./src/curator"
import { PaymentHandler } from "./src/payment"
import { LevelDBFlashStore } from "./src/store"


async function run(port: number): Promise<void> {
    dotenv.load()

    const lnRpcHost = process.env.LNRPC_REMOTE_HOST
    let config: LnRpcClientConfig
    if (!lnRpcHost) {
        const lnRpcNetwork = process.env.LNRPC_NETWORK || "testnet"
        config = {
            server: "localhost:10009",
            macaroonPath: resolve(`~/.lnd/data/chain/bitcoin/${lnRpcNetwork}/admin.macaroon`),
        }
    } else {
        config = {
            server: `${lnRpcHost}:10009`,
            tls: `./secret/${lnRpcHost}/tls.cert`,
            macaroonPath: `./secret/${lnRpcHost}/admin.macaroon`,
        }
    }
    console.log(`Connecting to LN RPC with config: ${JSON.stringify(config, null, 2)}`)
    const lnRpc = await createLnRpc(config)
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
