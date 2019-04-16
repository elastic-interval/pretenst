import { MigrationInterface, QueryRunner } from "typeorm"

import { User } from "../src/models/user"

export class CreateFirstUser1555344256454 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.manager.insert(User, {})
        await queryRunner.manager.insert(User, {})
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.manager.delete(User, 1)
    }
}
