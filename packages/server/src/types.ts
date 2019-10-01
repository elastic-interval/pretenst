
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export type HexalotID = string


export enum Surface {
    Unknown = "unknown",
    Land = "land",
    Water = "water",
}

export interface IslandGeography {
    hexalots: string
    spots: string,
}
