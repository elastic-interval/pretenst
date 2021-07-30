/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect } from "react"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"
import { Vector3 } from "three"

import { ConstructionView } from "../construction/construction-view"
import { EvoView } from "../evo/evo-view"
import { BOOTSTRAP, CONSTRUCTIONS } from "../fabric/bootstrap"
import { GlobalMode, globalModeFromUrl, nameToUrl, reloadGlobalMode } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { SPHERE_RADIUS, SphereView } from "../sphere/sphere-view"
import { TensegritySphere } from "../sphere/tensegrity-sphere"
import { globalModeAtom } from "../storage/recoil"

import { DesignView } from "./design-view"

export function MainView({createInstance}: { createInstance: CreateInstance }): JSX.Element {

    const [globalMode] = useRecoilState(globalModeAtom)
    useEffect(() => {
        const {mode, param} = globalModeFromUrl()
        if (mode !== globalMode.mode) {
            reloadGlobalMode(mode, param)
        }
    }, [])

    function visit(url: string): void {
        location.assign(url)
        location.reload()
    }

    switch (globalMode.mode) {
        case GlobalMode.Design:
            return <DesignView createInstance={createInstance}/>
        case GlobalMode.Construction:
            const tenscript = CONSTRUCTIONS.find(({name}) => nameToUrl(name) === globalMode.param)
            if (tenscript) {
                return <ConstructionView tenscript={tenscript} createInstance={createInstance}/>
            } else {
                reloadGlobalMode(GlobalMode.Choice)
                return <div/>
            }
        case GlobalMode.Evolution:
            return (
                <EvoView createBodyInstance={createInstance}/>
            )
        case GlobalMode.Sphere:
            return (
                <SphereView
                    frequencyParam={globalMode.param}
                    createSphere={(frequency: number, useGravity: boolean) => {
                        const sphereInstance = createInstance({
                            [WorldFeature.IterationsPerFrame]: 200,
                            [WorldFeature.Gravity]: 1000,
                            [WorldFeature.VisualStrain]: 0,
                            [WorldFeature.StiffnessFactor]: 800,
                        })
                        return new TensegritySphere(
                            new Vector3(0, 3, 0),
                            SPHERE_RADIUS, frequency, 0.3333, useGravity, sphereInstance,
                        )
                    }}
                />
            )
        default:
            return (
                <div id="choice-menu">
                    <h1>Pretenst App</h1>
                    <div className="d-inline-flex">
                        <div className="choice-menu-box">
                            <h4>Projects</h4>
                            <ButtonGroup className="choice-menu-group" vertical={true}>
                                {BOOTSTRAP.map(({scale, name}) => {
                                    if (scale === undefined) {
                                        return undefined
                                    }
                                    return (
                                        <Button size="lg" color="info" key={name}
                                                onClick={() => reloadGlobalMode(GlobalMode.Construction, nameToUrl(name))}
                                        >
                                            "{name}"
                                        </Button>
                                    )
                                })}
                            </ButtonGroup>
                        </div>
                        <div className="choice-menu-box">
                            <h4>Modes</h4>
                            <ButtonGroup className="choice-menu-group" vertical={true}>
                                <Button size="lg" color="info" onClick={() => reloadGlobalMode(GlobalMode.Sphere)}>
                                    Sphere
                                </Button>
                                <Button size="lg" color="info" onClick={() => reloadGlobalMode(GlobalMode.Design)}>
                                    Design
                                </Button>
                                <Button size="lg" color="info" onClick={() => reloadGlobalMode(GlobalMode.Evolution)}>
                                    Evolution
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div className="choice-menu-box">
                            <h4>Background</h4>
                            <ButtonGroup className="choice-menu-group" vertical={true}>
                                <Button size="lg" color="info" onClick={() => visit("https://pretenst.com/")}>
                                    Physical Construction
                                </Button>
                                <Button size="lg" color="info"
                                        onClick={() => visit("https://github.com/elastic-interval/pretenst")}>
                                    Virtual Design
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </div>
            )
    }
}
