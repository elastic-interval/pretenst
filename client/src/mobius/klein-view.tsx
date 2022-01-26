import { OrbitControls, Stars } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useState } from "react"
import { FaSignOutAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE } from "recoil"
import { Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { LINE_VERTEX_COLORS } from "../view/materials"

export function KleinView({createKlein}: {
    createKlein: (width: number, height: number) => Tensegrity,
}): JSX.Element {
    const [klein] = useState(() => {
        const m = createKlein(24, 41)
        m.iterate()
        return m
    })
    const RecoilBridge = useRecoilBridgeAcrossReactRoots_UNSTABLE()
    return (
        <div style={{position: "absolute", left: 0, right: 0, height: "100%"}}>
            <div id="bottom-right">
                <ButtonGroup>
                    <Button color="warning" onClick={() => reloadGlobalMode(GlobalMode.Choice)}><FaSignOutAlt/></Button>
                </ButtonGroup>
            </div>
            <Canvas style={{backgroundColor: "black"}}>
                <RecoilBridge>
                    {!klein ? <h1>No Klein</h1> : <KleinScene klein={klein} />}
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
