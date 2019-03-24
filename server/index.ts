import bodyParser from "body-parser"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import cookieParser from "cookie-parser"

import { createRouter } from "./src/router"
import { LevelDBFlashStore } from "./src/store"

const origin = process.env.NODE_ENV === "production" ?
    "https://galapagotchi.run" :
    "http://localhost:3000"

async function run(listenPort: number): Promise<void> {
    const db = new LevelDBFlashStore(__dirname + "/data/galapagotchi.db")

    const app = express()

    app.use(bodyParser())
    app.use(cookieParser())

    app.use(morgan("short"))

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", origin)
        res.header("Access-Control-Allow-Credentials", "true")
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
