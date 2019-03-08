import * as React from "react"
import * as R3 from "react-three"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {Color, Geometry, Mesh, PerspectiveCamera, Vector3} from "three"

import {HUNG_ALTITUDE, NORMAL_TICKS} from "../body/fabric"
import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"
import {Hexalot} from "../island/hexalot"
import {Island} from "../island/island"
import {Journey} from "../island/journey"
import {Spot} from "../island/spot"

import {EvolutionComponent} from "./evolution-component"
import {IslandComponent} from "./island-component"
import {JourneyComponent} from "./journey-component"
import {GOTCHI_MATERIAL, USER_POINTER_MATERIAL} from "./materials"
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
    homeHexalot: BehaviorSubject<Hexalot | undefined>
    selectedSpot: BehaviorSubject<Spot | undefined>
    orbitDistance: BehaviorSubject<OrbitDistance>
    gotchi?: Gotchi
    evolution?: Evolution
    journey?: Journey
}

interface IGotchiViewState {
    orbitDistance: OrbitDistance
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
        this.state = {
            orbitDistance: this.props.orbitDistance.getValue(),
        }
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
            this.subs.push(this.props.selectedSpot.subscribe(spot => {
                if (spot) {
                    if (spot.centerOfHexalot) {
                        this.target = new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center)
                    } else if (spot.canBeNewHexalot || spot.free) {
                        this.target = spot.center
                    }
                }
            }))
        }
    }

    public componentWillUnmount(): void {
        this.animating = false
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        return (
            <div id="gotchi-view" onMouseDownCapture={this.onMouseDownCapture}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.props.perspectiveCamera}>
                        <IslandComponent
                            island={this.props.island}
                            setMesh={(key: MeshKey, node: Mesh) => this.spotSelector.setMesh(key, node)}
                        />
                        {!this.props.evolution ? null : (
                            <EvolutionComponent evolution={this.props.evolution}/>)
                        }
                        {!this.props.gotchi ? null : (
                            <R3.Mesh
                                key="Gotchi"
                                geometry={this.props.gotchi.fabric.facesGeometry}
                                material={GOTCHI_MATERIAL}
                            />
                        )}
                        <R3.LineSegments
                            key="Pointer"
                            geometry={this.pointerGeometry}
                            material={USER_POINTER_MATERIAL}
                        />
                        {!this.props.journey ? null : (
                            <JourneyComponent journey={this.props.journey}/>
                        )}
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        )
    }

    // ==========================

    private get onMouseDownCapture(): (event: React.MouseEvent<HTMLDivElement>) => void {
        return (event: React.MouseEvent<HTMLDivElement>) => {
            if (this.props.evolution || this.props.gotchi) {
                return
            }
            if (event.button === 2) {
                this.props.selectedSpot.next(undefined)
                this.props.island.setIslandState(false, undefined)
            } else {
                const spot = this.spotSelector.getSpot(MeshKey.SPOTS_KEY, event)
                // todo: during island building we need this:
                // if (spot && (spot.centerOfHexalot || spot.canBeNewHexalot || spot.free)) {
                if (spot && spot.centerOfHexalot) {
                    this.props.selectedSpot.next(spot)
                }
            }
        }
    }

    // private get pointerGeometry(): Geometry | null {
    //     this.perspectiveCamera.updateProjectionMatrix();
    //     const upDown = this.state.orbitState === OrbitState.CRUISE ? -1 : 1;
    //     const userCoords = (x: number): Vector3 => {
    //         return new Vector3(x * 0.4 * upDown, -0.7 * upDown, -0.1 * upDown)
    //             .unproject(this.perspectiveCamera);
    //     };
    //     const geometry = new Geometry();
    //     const spot = this.props.selectedSpot.getValue();
    //     const action = this.props.evolution || this.props.gotchi;
    //     if (spot && this.orbit && !this.orbit.changing && !action) {
    //         const target = spot.centerOfHexalot ? new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center) : spot.center;
    //         geometry.vertices = [userCoords(0), target, userCoords(-1), target, userCoords(1), target];
    //     }
    //     return geometry;
    // }

    private get pointerGeometry(): Geometry | null {
        const geometry = new Geometry()
        const spot = this.props.selectedSpot.getValue()
        const action = this.props.evolution || this.props.gotchi
        if (spot && this.orbit && !action) {
            const target = spot.centerOfHexalot ? new Vector3(0, HUNG_ALTITUDE, 0).add(spot.center) : spot.center
            geometry.vertices = [target, new Vector3().addVectors(target, SUN_POSITION)]
        }
        return geometry
    }

    private animate(): void {
        const step = () => {
            setTimeout(
                () => {
                    if (this.props.evolution) {
                        this.props.evolution.iterate()
                        this.target = this.props.evolution.midpoint
                    }
                    if (this.props.gotchi) {
                        this.props.gotchi.iterate(NORMAL_TICKS)
                        this.target = this.props.gotchi.midpoint
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

