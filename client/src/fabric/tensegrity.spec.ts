
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { treeToCode, ICodeTree, codeToTree } from "./tensegrity-brick-types"

describe("Code parser", () => {
    it("should encode/decode", () => {
        const codeTrees = require("../../public/bootstrap.json").pretenst
        codeTrees.forEach((tree: ICodeTree) => {
            const code = treeToCode(tree)
            const middleman = codeToTree(error => console.error(error), code)
            if (!middleman) {
                throw new Error()
            }
            const codeAfter = treeToCode(middleman)
            expect(codeAfter).toBe(code)
        })
    })
})
