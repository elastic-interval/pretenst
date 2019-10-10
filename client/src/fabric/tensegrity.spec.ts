
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { codeTreeToString, ICodeTree, stringToCodeTree } from "./tensegrity-brick-types"

describe("Code parser", () => {
    it("should encode/decode", () => {
        const codeTrees = require("../../public/bootstrap.json").pretenst
        codeTrees.forEach((tree: ICodeTree) => {
            const code = codeTreeToString(tree)
            const middleman = stringToCodeTree(code)
            const codeAfter = codeTreeToString(middleman)
            expect(codeAfter).toBe(code)
        })
    })
})
