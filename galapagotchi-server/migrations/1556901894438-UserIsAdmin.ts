import {MigrationInterface, QueryRunner} from "typeorm";

export class UserIsAdmin1556901894438 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"hexalots":"","spots":""}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"spots": "", "hexalots": ""}'`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdmin"`);
    }

}
