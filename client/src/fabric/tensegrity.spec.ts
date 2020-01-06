/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BOOTSTRAP, codeToTenscript, ITenscript, treeToTenscript } from "./tenscript"

describe("Code parser", () => {
    it("should encode/decode", () => {
        BOOTSTRAP.forEach((tenscript: ITenscript) => {
            const middleman = codeToTenscript(error => console.error(error), false, tenscript.code)
            if (!middleman) {
                throw new Error()
            }
            const codeAfter = treeToTenscript(tenscript.name, middleman.tree, false)
            expect(codeAfter.code).toBe(tenscript.code)
        })
    })
})
