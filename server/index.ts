import bodyParser from "body-parser"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"

import { createRouter } from "./src/router"
import { LevelDBFlashStore } from "./src/store"

async function run(listenPort: number): Promise<void> {
    const db = new LevelDBFlashStore(__dirname + "/data/galapagotchi.db")

    const app = express()

    app.use(bodyParser())

    app.use(morgan("short"))

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Methods", "GET, POST")
        res.header("Access-Control-Allow-Headers", "Content-Type")
        next()
    })

    app.use("/api", createRouter(db))

    return new Promise<void>(
        resolve => app.listen(listenPort, resolve),
    )
}

dotenv.load()
const port = parseInt(process.env.PORT || "8000", 10)
run(port)
    .then(() => console.log(`Listening on port: ${port}`))
