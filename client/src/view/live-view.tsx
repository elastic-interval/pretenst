/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"

import { Tensegrity } from "../fabric/tensegrity"

import { LINE_VERTEX_COLORS } from "./materials"

export function LiveView({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    return (
        <lineSegments
            key="lines"
            geometry={tensegrity.instance.floatView.lineGeometry}
            material={LINE_VERTEX_COLORS}
            onUpdate={self => self.geometry.computeBoundingSphere()}
        />
    )
}
