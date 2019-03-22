import * as React from "react"
import { Button } from "reactstrap"
import { Subject } from "rxjs"
import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Subscription } from "rxjs/Subscription"
import { PerspectiveCamera } from "three"

import { IFabricExports } from "./body/fabric-exports"
import { createFabricKernel, FabricKernel } from "./body/fabric-kernel"
import { Physics } from "./body/physics"
import { INITIAL_JOINT_COUNT, MAX_POPULATION } from "./gotchi/evolution"
import { Island } from "./island/island"
import { IslandState } from "./island/island-state"
import { Surface } from "./island/spot"
import { IStorage } from "./storage/storage"
import { ActionsPanel } from "./view/actions-panel"
import { GotchiView } from "./view/gotchi-view"
import { InfoPanel } from "./view/info-panel"
import { OrbitDistance } from "./view/orbit"

interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
}

export interface IAppState {
    orbitDistance: OrbitDistance
    width: number
    height: number
    left: number
    top: number
    infoPanel: boolean
    islandState?: IslandState
}

function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

function getInfoPanelMaximized(): boolean {
    return "true" === localStorage.getItem("InfoPanel.maximized")
}

function setInfoPanelMaximized(maximized: boolean): void {
    localStorage.setItem("InfoPanel.maximized", maximized ? "true" : "false")
}

class App extends React.Component<IAppProps, IAppState> {
    private subs: Subscription[] = []
    private perspectiveCamera: PerspectiveCamera
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private islandSubject = new Subject<IslandState>()
    private physics = new Physics()
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        this.state = {
            infoPanel: getInfoPanelMaximized(),
            orbitDistance: this.orbitDistanceSubject.getValue(),
            width: window.innerWidth,
            height: window.innerHeight,
            left: window.screenLeft,
            top: window.screenTop,
        }
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000)
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.orbitDistanceSubject.subscribe(orbitDistance => this.setState({orbitDistance})))
        this.subs.push(this.islandSubject.subscribe(islandState => {
            const homeHexalot = islandState.homeHexalot
            if (homeHexalot) {
                location.replace(`/#/${homeHexalot.id}`)
                const spotCenters = homeHexalot.spots.map(spot => spot.center)
                const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            } else {
                location.replace("/#/")
            }
            this.setState({islandState})
        }))
        this.fetchIsland("rotterdam")
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        return (
            <div className="everything">
                {this.state.islandState ? (
                    <GotchiView
                        perspectiveCamera={this.perspectiveCamera}
                        islandState={this.state.islandState}
                        width={this.state.width}
                        height={this.state.height}
                        left={this.state.left}
                        top={this.state.top}
                        orbitDistance={this.orbitDistanceSubject}
                    />
                ) : (
                    <h1>No island!</h1>
                )}
                {!this.state.infoPanel ? (
                    <div className="info-panel-collapsed floating-panel">
                        <Button color="link" onClick={() => {
                            this.setState({infoPanel: true})
                            setInfoPanelMaximized(true)
                        }}>?</Button>
                    </div>
                ) : (
                    <div className="info-panel floating-panel">
                        <span>Galapagotchi</span>
                        <div className="info-title">
                            <div className="info-exit">
                                <Button onClick={() => {
                                    this.setState({infoPanel: false})
                                    setInfoPanelMaximized(false)
                                }}>X</Button>
                            </div>
                        </div>
                        <InfoPanel/>
                    </div>
                )}
                {this.state.islandState ? (
                    <div className="actions-panel-outer floating-panel">
                        <div className="actions-panel-inner">
                            <ActionsPanel
                                orbitDistance={this.orbitDistanceSubject}
                                islandState={this.state.islandState}
                                location={this.perspectiveCamera.position}
                            />
                        </div>
                    </div>
                ) : (
                    <h1>No island!</h1>
                )}
            </div>
        )
    }

    private fetchIsland(islandName: string): void {
        this.props.storage.getIslandData(islandName).then(islandData => {
            if (!islandData) {
                return
            }
            const island = new Island(
                this.islandSubject,
                islandData,
                this.fabricKernel,
                this.props.storage,
            )
            island.state.dispatch()
        })
    }
}

export default App
