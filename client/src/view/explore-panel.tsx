/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaSearch } from "react-icons/all"
import { BehaviorSubject } from "rxjs"

import { FloatFeature } from "../fabric/fabric-features"
import { IFabricState } from "../fabric/fabric-state"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { StrainPanel } from "./strain-panel"

export function ExplorePanel({fabric, features, fabricState$}: {
    fabric: TensegrityFabric,
    features: FloatFeature[],
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [showPushes, updateShowPushes] = useState(fabricState$.getValue().showPushes)
    const [showPulls, updateShowPulls] = useState(fabricState$.getValue().showPulls)
    useEffect(() => {
        const subscription = fabricState$.subscribe(newState => {
            updateShowPushes(newState.showPushes)
            updateShowPulls(newState.showPulls)
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <div className="m-4 w-100">
            <div className="text-center">
                <h2><FaSearch/> Explore <FaSearch/></h2>
            </div>
            <StrainPanel fabric={fabric} pushes={false}/>
            <StrainPanel fabric={fabric} pushes={true}/>
            <h1>pushes={showPushes.toString()}</h1>
            <h1>pulls={showPulls.toString()}</h1>
        </div>
    )
}
