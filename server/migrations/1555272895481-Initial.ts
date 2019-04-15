import { MigrationInterface, QueryRunner } from "typeorm"

export class Initial1555272895481 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TYPE "spot_surface_enum" AS ENUM('unknown', 'land', 'water')`)
        await queryRunner.query(`CREATE TABLE "spot" ("id" SERIAL NOT NULL, "connected" boolean NOT NULL DEFAULT false, "surface" "spot_surface_enum" NOT NULL DEFAULT 'unknown', "hexalotId" character varying(32), "islandName" character varying, "coordsX" integer NOT NULL, "coordsY" integer NOT NULL, CONSTRAINT "PK_f2a0a47e5ae78713daf83a5f7b0" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE TABLE "island" ("name" character varying NOT NULL, "compressedData" jsonb NOT NULL DEFAULT '{"hexalots":"","spots":""}', CONSTRAINT "PK_d2e09632410dca340e1232d8899" PRIMARY KEY ("name"))`)
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE TABLE "hexalot" ("id" character varying(32) NOT NULL, "nonce" integer NOT NULL, "genomeData" jsonb, "journey" jsonb, "islandName" character varying, "parentId" character varying(32), "ownerId" integer, "centerX" integer NOT NULL, "centerY" integer NOT NULL, CONSTRAINT "PK_0ac1613009c8e7f41143a632032" PRIMARY KEY ("id"))`)
        await queryRunner.query(`ALTER TABLE "spot" ADD CONSTRAINT "FK_181d639d96b512555545fc2c5af" FOREIGN KEY ("hexalotId") REFERENCES "hexalot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`ALTER TABLE "spot" ADD CONSTRAINT "FK_faa8e3189387b8ab4d75d881d43" FOREIGN KEY ("islandName") REFERENCES "island"("name") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`ALTER TABLE "hexalot" ADD CONSTRAINT "FK_2dd82fb9abba81aec81f1fe10ea" FOREIGN KEY ("islandName") REFERENCES "island"("name") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`ALTER TABLE "hexalot" ADD CONSTRAINT "FK_64b807eb36e3b326cfaa093ba9c" FOREIGN KEY ("parentId") REFERENCES "hexalot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`ALTER TABLE "hexalot" ADD CONSTRAINT "FK_dc45e4ee1d3ef7b05f37bc0046b" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`)
        await queryRunner.query(`ALTER TABLE "hexalot" DROP CONSTRAINT "FK_dc45e4ee1d3ef7b05f37bc0046b"`)
        await queryRunner.query(`ALTER TABLE "hexalot" DROP CONSTRAINT "FK_64b807eb36e3b326cfaa093ba9c"`)
        await queryRunner.query(`ALTER TABLE "hexalot" DROP CONSTRAINT "FK_2dd82fb9abba81aec81f1fe10ea"`)
        await queryRunner.query(`ALTER TABLE "spot" DROP CONSTRAINT "FK_faa8e3189387b8ab4d75d881d43"`)
        await queryRunner.query(`ALTER TABLE "spot" DROP CONSTRAINT "FK_181d639d96b512555545fc2c5af"`)
        await queryRunner.query(`DROP TABLE "hexalot"`)
        await queryRunner.query(`DROP TABLE "user"`)
        await queryRunner.query(`DROP TABLE "island"`)
        await queryRunner.query(`DROP TABLE "spot"`)
        await queryRunner.query(`DROP TYPE "spot_surface_enum"`)
    }

}
