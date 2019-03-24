#!/usr/bin/env node
"use strict"

const Axios = require("axios")
const program = require("commander")
const dotenv = require("dotenv")
const uuid = require("uuid")

async function run(baseUrl) {
  const userId = uuid.v4()
  const port = process.env.PORT || 8000
  console.log(`New user ID: ${userId}`)
  await Axios.post(
      `http://localhost:${port}/api/_add-user`,
      {userId},
  )
  console.log("Added user ID to database")

  const url = `${baseUrl}/#/login?userId=${userId}`
  console.log(`Login link: ${url.toString()}`)
}

dotenv.load()

program
    .option("-b, --base-url [url]", "Base URL", "https://galapagotchi.run")
    .parse(process.argv)

run(program.baseUrl)
    .catch(console.error)
    .then(() => console.log("Done"))
