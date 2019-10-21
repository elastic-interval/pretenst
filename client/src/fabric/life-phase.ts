/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

export enum LifePhase {
    Growing = 0,
    Shaping = 1,
    Slack = 2,
    Pretensing = 3,
    Pretenst = 4,
}

export function doNotTouch(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack
}

export function hideSurface(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Shaping
}

