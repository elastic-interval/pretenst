export function numHexalotTilesForRadius(radius: number): number {
    const nLayers = radius + 1
    if (nLayers <= 0) {
        return 0
    }
    return 3 * nLayers * nLayers - 3 * nLayers + 1
}
