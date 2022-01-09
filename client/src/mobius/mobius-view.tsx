import { OrbitControls, Stars } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useState } from "react"
import { FaSignOutAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE } from "recoil"
import { Color, Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { LINE_VERTEX_COLORS } from "../view/materials"

export function MobiusView({createMobius}: {
    createMobius: (segments: number) => Tensegrity,
}): JSX.Element {
    const [mobius] = useState(() => createMobius(60))
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
                    {!mobius ? <h1>No Mobius</h1> : <MobiusScene mobius={mobius}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

function MobiusScene({mobius}: { mobius: Tensegrity }): JSX.Element {
    const [target, setTarget] = useState(new Vector3())
    useFrame(state => {
        const {camera, clock} = state
        if (clock.elapsedTime < 0.01) {
            camera.position.set(0, 5, 15)
        }
        mobius.iterate()
        const toMidpoint = new Vector3().subVectors(mobius.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
    })
    return (
        <group>
            <OrbitControls target={target} maxDistance={200}/>
            <scene>
                <lineSegments
                    key="lines"
                    geometry={mobius.instance.floatView.lineGeometry}
                    material={LINE_VERTEX_COLORS}
                    onUpdate={self => self.geometry.computeBoundingSphere()}
                />
                <Stars radius={300}/>
                <ambientLight color={new Color("white")} intensity={0.8}/>
                <directionalLight color={new Color("#FFFFFF")} intensity={2}/>
            </scene>
        </group>
    )
}
