import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1555272895481 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TYPE "spot_surface_enum" AS ENUM('unknown', 'land', 'water')`);
        await queryRunner.query(`CREATE TABLE "spot" ("id" SERIAL NOT NULL, "connected" boolean NOT NULL, "surface" "spot_surface_enum" NOT NULL, "hexalotId" character varying(32), "coordsX" integer NOT NULL, "coordsY" integer NOT NULL, CONSTRAINT "PK_f2a0a47e5ae78713daf83a5f7b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "island" ("name" character varying NOT NULL, "compressedData" jsonb, CONSTRAINT "PK_d2e09632410dca340e1232d8899" PRIMARY KEY ("name"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hexalot" ("id" character varying(32) NOT NULL, "nonce" integer NOT NULL, "genomeData" jsonb NOT NULL, "journey" jsonb NOT NULL, "parentId" character varying(32), "islandName" character varying, "centerX" integer NOT NULL, "centerY" integer NOT NULL, CONSTRAINT "PK_0ac1613009c8e7f41143a632032" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "spot_adjacent_hexalots_hexalot" ("spotId" integer NOT NULL, "hexalotId" character varying(32) NOT NULL, CONSTRAINT "PK_ee077f6d85a7d919e1a56cccf1b" PRIMARY KEY ("spotId", "hexalotId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_51c54287abd92bed6fbfa5315c" ON "spot_adjacent_hexalots_hexalot" ("spotId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3f4c0ccaf803aa7506790f6fbe" ON "spot_adjacent_hexalots_hexalot" ("hexalotId") `);
        await queryRunner.query(`CREATE TABLE "spot_adjacent_spots_spot" ("spotId_1" integer NOT NULL, "spotId_2" integer NOT NULL, CONSTRAINT "PK_592ede279e400f9a46cf8f181e8" PRIMARY KEY ("spotId_1", "spotId_2"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7b406b3cd04f4f08656fb475ea" ON "spot_adjacent_spots_spot" ("spotId_1") `);
        await queryRunner.query(`CREATE INDEX "IDX_6a2b9fa6e0e7378775c0112b74" ON "spot_adjacent_spots_spot" ("spotId_2") `);
        await queryRunner.query(`ALTER TABLE "spot" ADD CONSTRAINT "FK_181d639d96b512555545fc2c5af" FOREIGN KEY ("hexalotId") REFERENCES "hexalot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hexalot" ADD CONSTRAINT "FK_64b807eb36e3b326cfaa093ba9c" FOREIGN KEY ("parentId") REFERENCES "hexalot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hexalot" ADD CONSTRAINT "FK_2dd82fb9abba81aec81f1fe10ea" FOREIGN KEY ("islandName") REFERENCES "island"("name") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_hexalots_hexalot" ADD CONSTRAINT "FK_51c54287abd92bed6fbfa5315cb" FOREIGN KEY ("spotId") REFERENCES "spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_hexalots_hexalot" ADD CONSTRAINT "FK_3f4c0ccaf803aa7506790f6fbe7" FOREIGN KEY ("hexalotId") REFERENCES "hexalot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_spots_spot" ADD CONSTRAINT "FK_7b406b3cd04f4f08656fb475ea9" FOREIGN KEY ("spotId_1") REFERENCES "spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_spots_spot" ADD CONSTRAINT "FK_6a2b9fa6e0e7378775c0112b74a" FOREIGN KEY ("spotId_2") REFERENCES "spot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_spots_spot" DROP CONSTRAINT "FK_6a2b9fa6e0e7378775c0112b74a"`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_spots_spot" DROP CONSTRAINT "FK_7b406b3cd04f4f08656fb475ea9"`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_hexalots_hexalot" DROP CONSTRAINT "FK_3f4c0ccaf803aa7506790f6fbe7"`);
        await queryRunner.query(`ALTER TABLE "spot_adjacent_hexalots_hexalot" DROP CONSTRAINT "FK_51c54287abd92bed6fbfa5315cb"`);
        await queryRunner.query(`ALTER TABLE "hexalot" DROP CONSTRAINT "FK_2dd82fb9abba81aec81f1fe10ea"`);
        await queryRunner.query(`ALTER TABLE "hexalot" DROP CONSTRAINT "FK_64b807eb36e3b326cfaa093ba9c"`);
        await queryRunner.query(`ALTER TABLE "spot" DROP CONSTRAINT "FK_181d639d96b512555545fc2c5af"`);
        await queryRunner.query(`DROP INDEX "IDX_6a2b9fa6e0e7378775c0112b74"`);
        await queryRunner.query(`DROP INDEX "IDX_7b406b3cd04f4f08656fb475ea"`);
        await queryRunner.query(`DROP TABLE "spot_adjacent_spots_spot"`);
        await queryRunner.query(`DROP INDEX "IDX_3f4c0ccaf803aa7506790f6fbe"`);
        await queryRunner.query(`DROP INDEX "IDX_51c54287abd92bed6fbfa5315c"`);
        await queryRunner.query(`DROP TABLE "spot_adjacent_hexalots_hexalot"`);
        await queryRunner.query(`DROP TABLE "hexalot"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "island"`);
        await queryRunner.query(`DROP TABLE "spot"`);
        await queryRunner.query(`DROP TYPE "spot_surface_enum"`);
    }

}
