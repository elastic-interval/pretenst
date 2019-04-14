import { MigrationInterface, QueryRunner } from "typeorm"

import { IslandIcosahedron } from "../src/island-icosahedron"
import { Island } from "../src/models/island"

export class PopulateIslands1555272895482 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.commitTransaction()
        await queryRunner.startTransaction()
        const islandNames = Object.keys(IslandIcosahedron)
        const partialEntities = islandNames.map(islandName => {
            return {name: islandName}
        })
        await Island.insert(partialEntities, {transaction: true})
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.commitTransaction()
        await queryRunner.startTransaction()
        await Island.delete("true")
    }
}
