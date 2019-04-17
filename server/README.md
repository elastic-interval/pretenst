

### Run

Easiest way to run the server is to run `docker-compose up` in the root project folder.
This will spin up a PostgreSQL instance, migrate the database schema and run the server.



Otherwise, run `docker-compose up -d db` to have a DB instance running and 
```bash
yarn install
yarn run start
```

(You can substitute npm for yarn)

### Database

Using [TypeORM](https://typeorm.io) and [PostgreSQL](https://www.postgresql.org)

To interact with the database, use `yarn typeorm [COMMAND]`

To nuke the entire database run
`yarn typeorm schema:drop`

To migrate the database, run `yarn typeorm migrate:run`
