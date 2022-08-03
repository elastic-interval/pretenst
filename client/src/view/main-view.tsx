/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect } from "react"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"
import { useRecoilState } from "recoil"
import { Vector3 } from "three"

import { ConstructionView } from "../construction/construction-view"
import { EvoView } from "../evo/evo-view"
import { BOOTSTRAP, CONSTRUCTIONS } from "../fabric/bootstrap"
import { GlobalMode, globalModeFromUrl, nameToUrl, reloadGlobalMode } from "../fabric/eig-util"
import { CreateInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { KleinBuilder } from "../mobius/klein-builder"
import { KleinView } from "../mobius/klein-view"
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
                        [WorldFeature.ShapingStiffnessFactor]: 1000,
                        [WorldFeature.VisualStrain]: 0,
                    })
                    const builder = new MobiusBuilder(segments)
                    return new Tensegrity(instance, 100, builder)
                }}/>
            )
        case GlobalMode.Klein:
            return (
                <KleinView createKlein={(width: number, height: number, shift: number)=> {
                    const instance = createInstance({
                        [WorldFeature.IterationsPerFrame]: 100,
                        [WorldFeature.Gravity]: 0,
                        [WorldFeature.ShapingDrag]: 10,
                        [WorldFeature.ShapingStiffnessFactor]: 5000,
                        [WorldFeature.VisualStrain]: 0,
                    })
                    instance.world.set_push_and_pull(true)
                    const builder = new KleinBuilder(width, height, shift)
                    return new Tensegrity(instance, 10, builder)
                }}/>
            )
        default:
            return (
                <Container id="choice-menu">
                    <Row>
                        <Col>
                            <h3 className="mb-2">Pretenst App</h3>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <h6>Projects</h6>
                            <ButtonGroup className="choice-menu-group" vertical={true}>
                                {BOOTSTRAP.map(({scale, name}) => {
                                    if (scale === undefined) {
                                        return undefined
                                    }
                                    return (
                                        <Button color="info" key={name}
                                                onClick={() => reloadGlobalMode(GlobalMode.Construction, nameToUrl(name))}
                                        >
                                            "{name}"
                                        </Button>
                                    )
                                })}
                            </ButtonGroup>
                        </Col>
                        <Col>
                            <h6>Modes</h6>
                            <ButtonGroup className="choice-menu-group" vertical={true}>
                                <Button color="info" onClick={() => reloadGlobalMode(GlobalMode.Klein)}>
                                    Klein Shape
                                </Button>
                                <Button color="info" onClick={() => reloadGlobalMode(GlobalMode.Mobius)}>
                                    Möbius Band
                                </Button>
                                <Button color="info" onClick={() => reloadGlobalMode(GlobalMode.Sphere)}>
                                    Tensegrity Spheres
                                </Button>
                                <Button color="info" onClick={() => reloadGlobalMode(GlobalMode.Design)}>
                                    Design Mode
                                </Button>
                                <Button color="info" onClick={() => reloadGlobalMode(GlobalMode.Evolution)}>
                                    Evolution Experiment
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                </Container>
            )
    }
}
