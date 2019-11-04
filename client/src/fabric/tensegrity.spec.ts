
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { codeTreeToTenscript, ICodeTree, tenscriptToCodeTree } from "./tenscript"

describe("Code parser", () => {
    it("should encode/decode", () => {
        const codeTrees = require("../../public/bootstrap.json").pretenst
        codeTrees.forEach((tree: ICodeTree) => {
            const code = codeTreeToTenscript(tree)
            const middleman = tenscriptToCodeTree(error => console.error(error), code)
            if (!middleman) {
                throw new Error()
            }
            const codeAfter = codeTreeToTenscript(middleman)
            expect(codeAfter).toBe(code)
        })
    })
})
