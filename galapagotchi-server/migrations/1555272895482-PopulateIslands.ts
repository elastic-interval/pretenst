import { DeepPartial, MigrationInterface, QueryRunner } from "typeorm"

import { Island } from "../src/models/island"

const DefaultIslands: Array<DeepPartial<Island>> = [
    {name: "tokyo"},
    {name: "delhi"},
    {name: "shanghai"},
    {name: "sao-paulo"},
    {name: "mexico-city"},
    {name: "cairo"},
    {name: "mumbai"},
    {name: "beijing"},
    {name: "dhaka"},
    {name: "osaka"},
    {name: "karachi"},
    {name: "buenos-aires"},
    {name: "chongqing"},
    {name: "istanbul"},
    {name: "kolkata"},
    {name: "manila"},
    {name: "lagos"},
    {name: "rio-de-janeiro"},
    {name: "tianjin"},
    {name: "guangzhou"},
    {name: "moscow"},
    {name: "shenzen"},
    {name: "lahore"},
    {name: "bangalore"},
    {name: "paris"},
    {name: "bogota"},
    {name: "jakarta"},
    {name: "chennai"},
    {name: "lima"},
    {name: "rotterdam"},
]

export class PopulateIslands1555272895482 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.manager.insert(Island, DefaultIslands)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.manager.delete(Island, "true")
    }
}
