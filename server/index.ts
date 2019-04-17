import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import "reflect-metadata"
import { createConnection } from "typeorm"

import { CLIENT_ORIGIN } from "./src/constants"
import { createRouter } from "./src/router"

async function run(listenPort: number): Promise<void> {
    await createConnection()

    const app = express()

    app.use(bodyParser())
    app.use(cookieParser())

    app.use(morgan("short"))

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", CLIENT_ORIGIN)
        res.header("Access-Control-Allow-Credentials", "true")
        res.header("Access-Control-Allow-Methods", "GET, POST")
        res.header("Access-Control-Allow-Headers", "Content-Type")
        next()
    })

    app.use("/api", createRouter())

    return new Promise<void>(
        resolve => app.listen(listenPort, resolve),
    )
}

dotenv.load()
const port = parseInt(process.env.PORT || "8000", 10)
run(port)
    .then(() => console.log(`Listening on port: ${port}`))
