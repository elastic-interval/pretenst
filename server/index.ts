import createLnRpc, { LnRpcClientConfig } from "@radar/lnrpc"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import { homedir } from "os"
import { join } from "path"

import { IslandCurator } from "./src/curator"
import { PaymentHandler } from "./src/payment"
import { LevelDBFlashStore } from "./src/store"


async function setupPaymentHandler(): Promise<PaymentHandler> {
    const lnRpcHost = process.env.LNRPC_REMOTE_HOST
    let config: LnRpcClientConfig
    if (!lnRpcHost) {
        const lnRpcNetwork = process.env.LNRPC_NETWORK || "testnet"
        config = {
            server: "localhost:10009",
            macaroonPath: join(homedir(), `/.lnd/data/chain/bitcoin/${lnRpcNetwork}/admin.macaroon`),
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
    return new PaymentHandler(lnRpc)
}

async function run(listenPort: number): Promise<void> {
    const db = new LevelDBFlashStore(__dirname + "/data/islandsdb")

    const payments = await setupPaymentHandler()

    const app = express()

    app.use(bodyParser())

    app.get("/test", (req, res) => res.end("OK"))

    app.use("/island/genesis",
        new IslandCurator("genesis", db, payments).createRouter())

    app.use(morgan("short"))

    return new Promise<void>(
        resolve => app.listen(listenPort, resolve),
    )
}

dotenv.load()
const port = parseInt(process.env.PORT || "8000", 10)
run(port)
    .then(() => console.log(`Listening on port: ${port}`))
