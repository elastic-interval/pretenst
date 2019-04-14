module.exports = {
  cache: true,
  cli: { "migrationsDir": "migrations" },
  database: "galapagotchi",
  entities: [
    "src/models/*.ts",
  ],
  host: process.env.POSTGRES_URI || "localhost",
  migrations: [
    "migrations/*.ts",
  ],
  password: "goomslatch",
  type: "postgres",
  username: "galapagotchi",
}
