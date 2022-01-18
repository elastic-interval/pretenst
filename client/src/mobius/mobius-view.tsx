import { OrbitControls, Stars } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import { useState } from "react"
import { FaSignOutAlt } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilBridgeAcrossReactRoots_UNSTABLE } from "recoil"
import { Color, DoubleSide, MeshLambertMaterial, Vector3 } from "three"

import { GlobalMode, reloadGlobalMode } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"

const meshLambertMaterial = new MeshLambertMaterial({color: "#FFFFFF", side: DoubleSide})

export function MobiusView({createMobius}: {
    createMobius: (segments: number) => Tensegrity,
}): JSX.Element {
    const [mobius] = useState(() => {
        const m = createMobius(40)
        m.iterate()
        return m
    })
    const [muscles] = useState(() => {
        const unordered = mobius.intervals.filter(({role}) => role.tag === "pull-length")
        const even = unordered.filter(({}, index) => index % 2 === 0)
        const odd = unordered.filter(({}, index) => index % 2 === 1)
        return even.concat(odd)
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
                    {!mobius ? <h1>No Mobius</h1> : <MobiusScene mobius={mobius} muscles={muscles}/>}
                </RecoilBridge>
            </Canvas>
        </div>
    )
}

function MobiusScene({mobius, muscles}: { mobius: Tensegrity, muscles: IInterval[] }): JSX.Element {
    const [target, setTarget] = useState(new Vector3())
    const [muscleIndex, setMuscleIndex] = useState(0)
    const [twitchTime, setTwitchTime] = useState(20000)
    useFrame(state => {
        const {camera, clock} = state
        if (clock.elapsedTime < 0.01) {
            const radius = mobius.joints.reduce((r, joint) => Math.max(r, mobius.instance.jointLocation(joint).length()), 0)
            const height = mobius.joints.reduce((h, joint) => Math.max(h, mobius.instance.jointLocation(joint).y), 0)
            camera.position.set(radius * 1.5, height * 2, 0)
        }
        mobius.iterate()
        const age = mobius.instance.fabric.age
        if (age > twitchTime) {
            const muscle = muscles[muscleIndex]
            mobius.instance.fabric.twitch_interval(muscle.index, 50000, 50000, 0.9)
            setMuscleIndex(idx => idx === muscles.length - 1 ? 0 : idx + 1)
            setTwitchTime(time => time + 25000)
        }
        const toMidpoint = new Vector3().subVectors(mobius.instance.midpoint, target).multiplyScalar(0.1)
        setTarget(new Vector3().copy(target).add(toMidpoint))
    })
    return (
        <group>
            <OrbitControls target={target} maxDistance={200}/>
            <scene>
                <mesh
                    geometry={mobius.instance.floatView.faceGeometry}
                    material={meshLambertMaterial}
                    matrixAutoUpdate={false}
                />
                <Stars radius={300}/>
                <ambientLight color={new Color("white")} intensity={0.2}/>
                <pointLight color={new Color("#ffffff")} position={new Vector3(0, 1000, 0)}/>
            </scene>
        </group>
    )
}
