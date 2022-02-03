import { OrbitControls, Stars } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useState } from "react"
import { FaSignOutAlt } from "react-icons/all"
import { Button, ButtonGroup, Form, FormGroup, Input, Label } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE } from "recoil"
import { Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { LINE_VERTEX_COLORS } from "../view/materials"

function toInt(s: string, d: number): number {
    const n = parseInt(s, 10)
    return isNaN(n) ? d : n
}

function isValid(s: string): boolean {
    return !isNaN(parseInt(s, 10))
}

export function KleinView({createKlein}: {
    createKlein: (width: number, height: number, shift: number) => Tensegrity,
}): JSX.Element {
    const [height, setHeight] = useState("41")
    const [width, setWidth] = useState("18")
    const [shift, setShift] = useState("0")
    const generate = () => {
        const m = createKlein(toInt(width, 18), toInt(height, 41), toInt(shift, 0))
        m.iterate()
        return m
    }
    const [klein, setKlein] = useState(generate)
    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="bottom-right">
                <ButtonGroup>
                    <Button color="warning" onClick={() => reloadGlobalMode(GlobalMode.Choice)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <div id="top-left">
                <Form
                    style={{width: "7em", backgroundColor: "white", margin: "1em", padding: "1em", borderRadius: "1em"}}
                    onSubmit={e => {
                        e.preventDefault()
                        setKlein(() => generate())
                    }}>
                    <FormGroup>
                        <Label for="height">Height</Label>
                        <Input id="height"
                               value={height}
                               valid={isValid(height)}
                               invalid={!isValid(height)}
                               onChange={({target}) => {
                                   console.log("set height", target.value)
                                   setHeight(target.value)
                               }}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="width">Width</Label>
                        <Input id="width"
                               value={width}
                               valid={isValid(width)}
                               invalid={!isValid(width)}
                               onChange={({target}) => setWidth(target.value)}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="shift">Shift</Label>
                        <Input id="shift"
                               value={shift}
                               valid={isValid(shift)}
                               invalid={!isValid(shift)}
                               onChange={({target}) => setShift(target.value)}
                        />
                    </FormGroup>
                    <Button color="success" className="w-100 my-1" type="submit">Go</Button>
                </Form>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <RecoilBridge>
                    {!klein ? <h1>No Klein</h1> : <KleinScene klein={klein}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

function KleinScene({klein}: { klein: Tensegrity }): JSX.Element {
    const [target, setTarget] = useState(new Vector3())
    useFrame(state => {
        const {camera, clock} = state
        if (clock.elapsedTime < 0.01) {
            camera.position.set(40, 0, 0)
        }
        klein.iterate()
        const toMidpoint = new Vector3().subVectors(klein.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
    })
    return (
        <group>
            <OrbitControls target={target} maxDistance={200} zoomSpeed={0.3}/>
            <scene>
                <lineSegments
                    geometry={klein.instance.floatView.lineGeometry}
                    material={LINE_VERTEX_COLORS}
                    onUpdate={self => self.geometry.computeBoundingSphere()}
                />
                <Stars radius={300}/>
            </scene>
        </group>

    )
}
