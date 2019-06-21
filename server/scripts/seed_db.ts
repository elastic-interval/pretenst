import {readFileSync} from "fs"
import { createConnection } from "typeorm"

const SEED_FILES: string[] = [
    "spots.sql",
    "twitter_profiles.sql",
    "users.sql",
    "hexalots.sql",
]

async function run(): Promise<void> {
    const conn = await createConnection()
    await conn.transaction(async manager => {
        for (const filename of SEED_FILES) {
            const seedDataSql = readFileSync(`${__dirname}/sql/${filename}`)
                .toString("utf-8")
            console.log(`Read seed SQL file: ${filename} with ${seedDataSql.split("\n").length} lines`)
            await manager.query(seedDataSql)
        }
    })
}

console.log("Seeding DB with data..")
run().then(() => {
    console.log("Done!")
    process.exit(0)
})
