/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"

export function isIntervalSelect(event: React.MouseEvent<Element, MouseEvent>): boolean {
    return event.shiftKey
}

export function isIntervalBuilt(event: React.MouseEvent<Element, MouseEvent>): boolean {
    return event.altKey
}
