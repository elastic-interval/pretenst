

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

To nuke the entire database run
`yarn db:drop`

To migrate the database, run `yarn db:migrate`

To seed your local DB with data, run `yarn db:seed`

To do all three steps in one, run `yarn db:hard_reset`
