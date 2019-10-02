/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export function numHexalotTilesForRadius(radius: number): number {
    const nLayers = radius + 1
    if (nLayers <= 0) {
        return 0
    }
    return 3 * nLayers * nLayers - 3 * nLayers + 1
}
