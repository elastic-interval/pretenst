/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BOOTSTRAP, codeToTenscript, ITenscript, treeToTenscript } from "./tenscript"

describe("Code parser", () => {
    it("should encode/decode", () => {
        BOOTSTRAP.forEach((tenscript: ITenscript) => {

            const translated = codeToTenscript(error => console.error(error), false, tenscript.code)
            if (!translated) {
                throw new Error()
            }
            const codeAfter = treeToTenscript(tenscript.name, translated.tree, translated.marks, false)
            expect(codeAfter.code).toBe(tenscript.code)
        })
    })
})
