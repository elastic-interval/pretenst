import {MigrationInterface, QueryRunner} from "typeorm"

export class TwitterIdentity1555512586626 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "twitter_profile" ("id" character varying NOT NULL, "username" character varying NOT NULL, "displayName" character varying NOT NULL, "provider" character varying NOT NULL, "photos" jsonb, "emails" jsonb, "gender" character varying, "name" jsonb, "_accessLevel" character varying NOT NULL, "_json" jsonb, "_raw" character varying NOT NULL, CONSTRAINT "PK_b0917e4ff0140c91a83a7d629ba" PRIMARY KEY ("id"))`)
        await queryRunner.query(`ALTER TABLE "user" ADD "twitterProfileId" character varying`)
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_3b2de0c816f8c7c819559c2108d" UNIQUE ("twitterProfileId")`)
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"hexalots":"","spots":""}'`)
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_3b2de0c816f8c7c819559c2108d" FOREIGN KEY ("twitterProfileId") REFERENCES "twitter_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_3b2de0c816f8c7c819559c2108d"`)
        await queryRunner.query(`ALTER TABLE "island" ALTER COLUMN "geography" SET DEFAULT '{"spots": "", "hexalots": ""}'`)
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_3b2de0c816f8c7c819559c2108d"`)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "twitterProfileId"`)
        await queryRunner.query(`DROP TABLE "twitter_profile"`)
    }
}
