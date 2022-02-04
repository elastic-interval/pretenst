import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useState } from "react"
import { FaSignOutAlt } from "react-icons/all"
import { Button, ButtonGroup, Form, FormGroup, Input, Label } from "reactstrap"
import { atom, useRecoilBridgeAcrossReactRoots_UNSTABLE, useRecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"
import { Color, DoubleSide, MeshLambertMaterial, Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { LINE_VERTEX_COLORS } from "../view/materials"

const meshLambertMaterial = new MeshLambertMaterial({color: "#FFFFFF", side: DoubleSide})

export function KleinView({createKlein}: {
    createKlein: (width: number, height: number, shift: number) => Tensegrity,
}): JSX.Element {
    const [height, setHeight] = useRecoilState(heightAtom)
    const [width, setWidth] = useRecoilState(widthAtom)
    const [shift, setShift] = useRecoilState(shiftAtom)
    const [frozen, setFrozen] = useState(false)
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
                        setFrozen(false)
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
                    <Button color={frozen ? "warning" : "secondary"} className="w-100 my-1"
                            onClick={() => setFrozen(!frozen)}>{frozen ? "Frozen" : "Live"}</Button>
                    <Button color="success" className="w-100 my-1" type="submit">Go</Button>
                </Form>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <RecoilBridge>
                    {!klein ? <h1>No Klein</h1> : <KleinScene klein={klein} frozen={frozen}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

function KleinScene({klein, frozen}: { klein: Tensegrity, frozen: boolean }): JSX.Element {
    const [target, setTarget] = useState(new Vector3())
    useFrame(state => {
        const {camera, clock} = state
        if (clock.elapsedTime < 0.01) {
            camera.position.set(40, 0, 0)
        }
        if (!frozen) {
            klein.iterate()
        }
        const toMidpoint = new Vector3().subVectors(klein.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
    })
    return (
        <group>
            <OrbitControls target={target} maxDistance={200} zoomSpeed={0.3}/>
            <scene>
                {frozen?(
                    <mesh
                        geometry={klein.instance.floatView.faceGeometry}
                        material={meshLambertMaterial}
                        matrixAutoUpdate={false}
                    />
                ):(
                    <lineSegments
                        geometry={klein.instance.floatView.lineGeometry}
                        material={LINE_VERTEX_COLORS}
                        onUpdate={self => self.geometry.computeBoundingSphere()}
                    />
                )}
                <PerspectiveCamera makeDefault={true}>
                    <pointLight color={new Color("#4fa903")} position={new Vector3(0, 100, 0)}/>
                    <pointLight color={new Color("#043eb7")} position={new Vector3(0, -10, 100)}/>
                    <pointLight color={new Color("#f60606")} position={new Vector3(0, -10, -100)}/>
                </PerspectiveCamera>
            </scene>
        </group>

    )
}

const {persistAtom} = recoilPersist({
    key: "Klein",
    storage: localStorage,
})

const PERSIST = [persistAtom]

const heightAtom = atom({
    key: "length",
    default: 41,
    effects_UNSTABLE: PERSIST,
})

const widthAtom = atom({
    key: "width",
    default: 18,
    effects_UNSTABLE: PERSIST,
})

const shiftAtom = atom({
    key: "shift",
    default: 0,
    effects_UNSTABLE: PERSIST,
})

function toInt(s: string, d: number): number {
    const n = parseInt(s, 10)
    return isNaN(n) ? d : n
}

function isValid(s: string): boolean {
    return !isNaN(parseInt(s, 10))
}
