/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

const path = require("path")
const fs = require("fs")

const typesPath = path.resolve(__dirname, "./node_modules/react-three-fiber/types/src/three-types.d.ts")
const types = fs.readFileSync(typesPath, "utf8")
const fixed = types.replace(/audio:/, "audio__removed:").replace(/line:/, "line__removed:")

fs.writeFileSync(typesPath, fixed);

