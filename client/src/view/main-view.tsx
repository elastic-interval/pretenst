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
import { Tensegrity } from "../fabric/tensegrity"
import { MobiusBuilder } from "../mobius/mobius-builder"
import { MobiusView } from "../mobius/mobius-view"
import { SphereBuilder } from "../sphere/sphere-builder"
import { SphereView, SPHERE_RADIUS } from "../sphere/sphere-view"
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
        window.open(url, "_blank")
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
                    createSphere={(frequency: number, gravity: number, useCurves: boolean) => {
                        const g = () => {
                            switch (gravity) {
                                case 0:
                                    return 0
                                case 1:
                                    return 25
                                default:
                                    return 1500
                            }
                        }
                        const instance = createInstance({
                            [WorldFeature.IterationsPerFrame]: 200,
                            [WorldFeature.Gravity]: g(),
                            [WorldFeature.ShapingStiffnessFactor]: 600,
                            [WorldFeature.ShapingDrag]: 300,
                            [WorldFeature.Drag]: 0,
                            [WorldFeature.VisualStrain]: 0,
                            [WorldFeature.StiffnessFactor]: 800,
                        })
                        const builder = new SphereBuilder(new Vector3(0, 60, 0), frequency, SPHERE_RADIUS, useCurves)
                        return new Tensegrity(instance, 100, builder)
                    }}
                />
            )
        case GlobalMode.Mobius:
            return (
                <MobiusView createMobius={(segments: number) => {
                    const instance = createInstance({
                        [WorldFeature.IterationsPerFrame]: 1000,
                        [WorldFeature.Gravity]: 0,
                        [WorldFeature.ShapingDrag]: 10,
                        [WorldFeature.VisualStrain]: 0,
                        [WorldFeature.Drag]: 0,
                    })
                    const builder = new MobiusBuilder(segments)
                    return new Tensegrity(instance, 100, builder)
                }}/>
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
                                <Button size="lg" color="info" onClick={() => reloadGlobalMode(GlobalMode.Mobius)}>
                                    Möbius
                                </Button>
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
                                    Construction Stories
                                </Button>
                                <Button size="lg" color="info"
                                        onClick={() => visit("https://github.com/elastic-interval/pretenst")}>
                                    Virtual Design Software
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </div>
            )
    }
}
