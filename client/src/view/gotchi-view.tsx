import * as React from "react"
import * as R3 from "react-three"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {Color, Geometry, Mesh, PerspectiveCamera, Vector3} from "three"

import {HUNG_ALTITUDE, NORMAL_TICKS} from "../body/fabric"
import {Island} from "../island/island"
import {IslandState} from "../island/island-state"
import {Spot} from "../island/spot"

import {EvolutionComponent} from "./evolution-component"
import {IslandComponent} from "./island-component"
import {JourneyComponent} from "./journey-component"
import {GOTCHI_MATERIAL, GOTCHI_POINTER_MATERIAL, USER_POINTER_MATERIAL} from "./materials"
import {Orbit, OrbitDistance} from "./orbit"
import {MeshKey, SpotSelector} from "./spot-selector"

export const HIGH_ALTITUDE = 1000

const SUN_POSITION = new Vector3(0, 400, 0)
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8)

interface IGotchiViewProps {
    perspectiveCamera: PerspectiveCamera
    width: number
    height: number
    left: number
    top: number
    island: Island
    orbitDistance: BehaviorSubject<OrbitDistance>
    clickSpot: (spot: Spot) => void
}

interface IGotchiViewState {
    orbitDistance: OrbitDistance
    islandState: IslandState
}

export class GotchiView extends React.Component<IGotchiViewProps, IGotchiViewState> {
    private subs: Subscription[] = []
    private orbit: Orbit
    private spotSelector: SpotSelector
    private animating = true
    private target?: Vector3

    constructor(props: IGotchiViewProps) {
        super(props)
        this.props.perspectiveCamera.position.addVectors(props.island.midpoint, new Vector3(0, HIGH_ALTITUDE / 2, 0))
        const orbitDistance = this.props.orbitDistance.getValue()
        const islandState = props.island.islandStateSubject.getValue()
        this.state = {orbitDistance, islandState}
        this.spotSelector = new SpotSelector(
            this.props.perspectiveCamera,
            this.props.island,
            this.props.width,
            this.props.height,
        )
    }

    public componentDidUpdate(prevProps: Readonly<IGotchiViewProps>, prevState: Readonly<IGotchiViewState>, snapshot: object): void {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.props.perspectiveCamera.aspect = this.props.width / this.props.height
            this.props.perspectiveCamera.updateProjectionMatrix()
            this.spotSelector.setSize(this.props.width, this.props.height)
        }
    }

    public componentDidMount(): void {
        const element: Element | null = document.getElementById("gotchi-view")
        if (element) {
            this.target = this.props.island.midpoint
            this.orbit = new Orbit(element, this.props.perspectiveCamera, this.props.orbitDistance, this.target)
            this.animate()
            this.subs.push(this.props.orbitDistance.subscribe(orbitDistance => this.setState({orbitDistance})))
            this.subs.push(this.props.island.islandStateSubject.subscribe(islandState => {
                const spot = islandState.selectedSpot
                if (spot) {
                    if (spot.centerOfHexalot) {
                        this.target = new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center)
                    } else { // todo: else if (spot.canBeNewHexalot || spot.free) {
                        this.target = spot.center
                    }
                }
                this.setState({islandState})
            }))
        }
    }

    public componentWillUnmount(): void {
        this.animating = false
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        const evolution = this.state.islandState.evolution
        const gotchi = this.state.islandState.gotchi
        const journey = this.state.islandState.journey
        return (
            <div id="gotchi-view" onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>) => {
                const spot = this.spotSelector.getSpot(MeshKey.SPOTS_KEY, event)
                if (spot) {
                    this.props.clickSpot(spot)
                }
            }}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.props.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {!evolution ? null : (
                            <EvolutionComponent evolution={evolution}/>)
                        }
                        {!gotchi ? null : (
                            <R3.Object3D key="Gotchi">
                                <R3.LineSegments
                                    key="Vectors"
                                    geometry={gotchi.fabric.pointerGeometryFor(gotchi.fabric.currentDirection)}
                                    material={GOTCHI_POINTER_MATERIAL}
                                />
                                <R3.Mesh
                                    geometry={gotchi.fabric.facesGeometry}
                                    material={GOTCHI_MATERIAL}
                                />
                            </R3.Object3D>
                        )}
                        <R3.LineSegments
                            key="Pointer"
                            geometry={this.pointerGeometry}
                            material={USER_POINTER_MATERIAL}
                        />
                        {!journey ? null : (
                            <JourneyComponent journey={journey}/>
                        )}
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

    // ==========================

    // todo: cache this, dispose old ones
    private get pointerGeometry(): Geometry | null {
        const geometry = new Geometry()
        const islandState = this.state.islandState
        const selectedSpot = islandState.selectedSpot
        if (selectedSpot) {
            const center = selectedSpot.center
            const occupiedHexalot = selectedSpot.centerOfHexalot && selectedSpot.centerOfHexalot.occupied
            const target = occupiedHexalot ? new Vector3(0, HUNG_ALTITUDE, 0).add(center) : center
            geometry.vertices = [target, new Vector3().addVectors(target, SUN_POSITION)]
        }
        return geometry
    }

    private animate(): void {
        const step = () => {
            setTimeout(
                () => {
                    const evolution = this.state.islandState.evolution
                    if (evolution) {
                        evolution.iterate()
                        this.target = evolution.midpoint
                    }
                    const gotchi = this.state.islandState.gotchi
                    if (gotchi) {
                        gotchi.iterate(NORMAL_TICKS)
                        this.target = gotchi.midpoint
                    }
                    if (this.target) {
                        this.orbit.moveTargetTowards(this.target)
                    }
                    if (this.animating) {
                        this.orbit.update()
                        this.forceUpdate()
                        requestAnimationFrame(step)
                    }
                },
                10,
            )
        }
        requestAnimationFrame(step)
    }
}

