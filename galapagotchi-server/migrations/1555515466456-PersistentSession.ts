import {MigrationInterface, QueryRunner} from "typeorm";

export class PersistentSession1555515466456 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "session" ("id" character varying NOT NULL, "expiresAt" integer NOT NULL, "data" character varying NOT NULL, CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"hexalots":"","spots":""}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"spots": "", "hexalots": ""}'`);
        await queryRunner.query(`DROP TABLE "session"`);
    }

}
