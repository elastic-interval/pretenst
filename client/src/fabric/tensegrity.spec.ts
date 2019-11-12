
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { codeTreeToTenscript, ITenscriptTree, codeToTenscriptTree } from "./tenscript"

describe("Code parser", () => {
    it("should encode/decode", () => {
        const codeTrees = require("../../public/bootstrap.json").pretenst
        codeTrees.forEach((tree: ITenscriptTree) => {
            const tenscript = codeTreeToTenscript(tree)
            const middleman = codeToTenscriptTree(error => console.error(error), tenscript.code)
            if (!middleman) {
                throw new Error()
            }
            const codeAfter = codeTreeToTenscript(middleman)
            expect(codeAfter).toBe(tenscript.code)
        })
    })
})
