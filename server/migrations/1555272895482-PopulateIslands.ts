import { MigrationInterface, QueryRunner } from "typeorm"

import { IslandIcosahedron } from "../src/island-icosahedron"
import { Island } from "../src/models/island"

export class PopulateIslands1555272895482 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        const islands = Object.keys(IslandIcosahedron)
            .map(islandName => {
                return {name: islandName}
            })
        await queryRunner.manager.insert(Island, islands)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.manager.delete(Island, "true")
    }
}
