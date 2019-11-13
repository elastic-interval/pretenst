/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { codeToTenscript, ITenscriptTree, treeToTenscript } from "./tenscript"

describe("Code parser", () => {
    it("should encode/decode", () => {
        const codeTrees = require("../../public/bootstrap.json").pretenst
        codeTrees.forEach((tree: ITenscriptTree) => {
            const tenscript = treeToTenscript(tree)
            const middleman = codeToTenscript(error => console.error(error), tenscript.code)
            if (!middleman) {
                throw new Error()
            }
            const codeAfter = treeToTenscript(middleman.tree)
            expect(codeAfter).toBe(tenscript.code)
        })
    })
})
