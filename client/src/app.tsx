import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera, Vector3} from "three"

import {AppStorage} from "./app-storage"
import {Fabric} from "./body/fabric"
import {Direction, IFabricExports, turn} from "./body/fabric-exports"
import {createFabricKernel, FabricKernel} from "./body/fabric-kernel"
import {Physics} from "./body/physics"
import {Genome, IGenomeData} from "./genetics/genome"
import {Evolution, INITIAL_JOINT_COUNT, MAX_POPULATION} from "./gotchi/evolution"
import {Gotchi} from "./gotchi/gotchi"
import {Hexalot} from "./island/hexalot"
import {Island, IslandState} from "./island/island"
import {Spot, Surface} from "./island/spot"
import {Trip} from "./island/trip"
import {ActionsPanel, Command} from "./view/actions-panel"
import {GotchiView} from "./view/gotchi-view"
import {InfoPanel} from "./view/info-panel"
import {OrbitDistance} from "./view/orbit"

interface IAppProps {
    fabricExports: IFabricExports
    storage: AppStorage
}

export interface IAppState {
    island: Island
    width: number
    height: number
    infoPanel: boolean
    actionPanel: boolean

    master?: string
    orbitDistance: OrbitDistance
    spot?: Spot
    gotchi?: Gotchi
    evolution?: Evolution
    trip?: Trip
}

function updateDimensions(): object {
    return {width: window.innerWidth, height: window.innerHeight}
}

function dispose(state: IAppState): void {
    if (state.gotchi) {
        state.gotchi.dispose()
    }
    if (state.evolution) {
        state.evolution.dispose()
    }
}

function startEvolution(hexalot: Hexalot): object {
    return (state: IAppState, props: IAppProps) => {
        state.island.setIslandState(true, hexalot)
        dispose(state)
        const trip = hexalot.createStupidTrip()
        const saveGenome = (genomeData: IGenomeData) => {
            console.log(`Saving genome data`)
            props.storage.setGenome(hexalot, genomeData)
        }
        return {
            gotchi: undefined,
            evolution: new Evolution(hexalot, trip, saveGenome),
            trip,
        }
    }
}

function startGotchi(hexalot: Hexalot): object {
    return (state: IAppState) => {
        state.island.setIslandState(true, hexalot)
        dispose(state)
        console.warn("Start gotchi", hexalot.genome)
        const gotchi = hexalot.createGotchi()
        // gotchi.travel = state.trip.createTravel(0);
        return {
            gotchi,
            evolution: undefined,
            trip: undefined,
        }
    }
}

function selectSpot(spot?: Spot): object {
    return (state: IAppState) => {
        state.island.setIslandState(false, spot ? spot.centerOfHexalot : undefined)
        dispose(state)
        return {
            actionPanel: true,
            spot,
            gotchi: undefined,
            evolution: undefined,
            trip: undefined,
        }
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
    private orbitDistanceSubject: BehaviorSubject<OrbitDistance> =
        new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private perspectiveCamera: PerspectiveCamera
    private selectedSpotSubject: BehaviorSubject<Spot | undefined> = new BehaviorSubject<Spot | undefined>(undefined)
    private islandState: BehaviorSubject<IslandState>
    private physics: Physics
    private fabricKernel: FabricKernel
    private instanceUsed: boolean[]

    constructor(props: IAppProps) {
        super(props)
        this.physics = new Physics(props.storage)
        this.physics.applyToFabric(props.fabricExports)
        this.islandState = new BehaviorSubject<IslandState>({gotchiAlive: false})
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        this.instanceUsed = this.fabricKernel.instance.map(() => false)
        const createGotchiAt = (location: Vector3, genome: Genome): Gotchi => {
            const freeIndex = this.instanceUsed.indexOf(false)
            if (freeIndex < 0) {
                throw new Error("No free fabrics!")
            }
            this.instanceUsed[freeIndex] = true
            const exports = this.fabricKernel.instance[freeIndex]
            exports.flushFaces()
            const fabric = new Fabric(exports, freeIndex).createSeed(location.x, location.z)
            fabric.iterate(0)
            return new Gotchi(fabric, genome, () => this.instanceUsed[fabric.index] = false)
        }
        this.state = {
            infoPanel: getInfoPanelMaximized(),
            actionPanel: false,
            orbitDistance: this.orbitDistanceSubject.getValue(),
            island: new Island("GalapagotchIsland", this.islandState, {createGotchiAt}, this.props.storage),
            master: this.props.storage.getMaster(),
            width: window.innerWidth,
            height: window.innerHeight,
        }
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000)
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.selectedSpotSubject.subscribe(spot => {
            if (spot && !this.state.evolution && !this.state.gotchi) {
                this.setState(selectSpot(spot))
            }
        }))
        this.subs.push(this.orbitDistanceSubject.subscribe(orbitDistance => this.setState({orbitDistance})))
        this.subs.push(this.islandState.subscribe(islandState => {
            const hexalot = islandState.selectedHexalot
            if (hexalot) {
                const spotCenters = hexalot.spots.map(spot => spot.center)
                const surface = hexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            }
        }))
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        return (
            <div className="everything">
                <GotchiView
                    perspectiveCamera={this.perspectiveCamera}
                    island={this.state.island}
                    width={this.state.width}
                    height={this.state.height}
                    selectedSpot={this.selectedSpotSubject}
                    orbitDistance={this.orbitDistanceSubject}
                    evolution={this.state.evolution}
                    trip={this.state.trip}
                    gotchi={this.state.gotchi}
                />
                {!this.state.infoPanel ? (
                    <div className="info-panel-collapsed floating-panel">
                        <Button color="link" onClick={() => {
                            this.setState({infoPanel: true})
                            setInfoPanelMaximized(true)
                        }}>?</Button>
                    </div>
                ) : (
                    <div className="info-panel floating-panel">
                        <div className="info-title">
                            <h3>Galapagotchi Run!</h3>
                            <div className="info-exit">
                                <Button color="link" onClick={() => {
                                    this.setState({infoPanel: false})
                                    setInfoPanelMaximized(false)
                                }}>X</Button>
                            </div>
                        </div>
                        <InfoPanel master={this.state.master}/>
                    </div>
                )}
                {!this.state.actionPanel ? (
                    <div className="actions-panel-collapsed floating-panel">
                        <Button color="link" onClick={() => this.setState({actionPanel: true})}>!</Button>
                    </div>
                ) : (
                    <div className="actions-panel floating-panel">
                        <div className="info-title">
                            <h3>Actions</h3>
                            <div className="action-exit">
                                <Button color="link" onClick={() => this.setState({actionPanel: false})}>X</Button>
                            </div>
                        </div>
                        <ActionsPanel
                            orbitDistance={this.orbitDistanceSubject}
                            cameraLocation={this.perspectiveCamera.position}
                            spot={this.state.spot}
                            hexalot={this.islandState.getValue().selectedHexalot}
                            master={this.state.master}
                            gotchi={this.state.gotchi}
                            evolution={this.state.evolution}
                            doCommand={this.executeCommand}
                        />
                    </div>
                )}
            </div>
        )
    }

    private executeCommand = (command: Command, location?: Vector3) => {
        const island = this.state.island
        const master = this.state.master
        const spot = this.state.spot
        const hexalot = island.islandState.getValue().selectedHexalot
        const gotchi = this.state.gotchi
        switch (command) {
            case Command.DETACH:
                this.selectedSpotSubject.next(undefined)
                this.state.island.setIslandState(false)
                break
            case Command.SAVE_GENOME:
                if (hexalot && gotchi) {
                    console.log("Saving")
                    const genomeData = gotchi.genomeData
                    this.props.storage.setGenome(hexalot, genomeData)
                }
                break
            case Command.DELETE_GENOME:
                if (hexalot) {
                    console.log("Deleting")
                    hexalot.genome = undefined
                }
                break
            case Command.RETURN_TO_SEED:
                const selectedSpot = this.selectedSpotSubject.getValue()
                this.selectedSpotSubject.next(selectedSpot) // refresh
                this.setState(selectSpot(selectedSpot))
                break
            case Command.LAUNCH_GOTCHI:
                if (hexalot) {
                    this.setState(startGotchi(hexalot))
                }
                break
            case Command.LAUNCH_EVOLUTION:
                if (hexalot) {
                    this.setState(startEvolution(hexalot))
                }
                break
            case Command.TURN_LEFT:
                if (gotchi) {
                    gotchi.direction = turn(gotchi.direction, false)
                }
                break
            case Command.TURN_RIGHT:
                if (gotchi) {
                    gotchi.direction = turn(gotchi.direction, true)
                }
                break
            case Command.COME_HERE:
                if (gotchi && location) {
                    gotchi.approach(location, true)
                }
                break
            case Command.GO_THERE:
                if (gotchi && location) {
                    gotchi.approach(location, false)
                }
                break
            case Command.STOP:
                if (gotchi) {
                    gotchi.direction = Direction.REST
                }
                break
            case Command.CREATE_LAND:
                if (spot && spot.free) {
                    spot.surface = Surface.Land
                    island.refreshStructure()
                }
                break
            case Command.CREATE_WATER:
                if (spot && spot.free) {
                    spot.surface = Surface.Water
                    island.refreshStructure()
                }
                break
            case Command.CLAIM_GOTCH:
                if (spot && master) {
                    island.removeFreeHexalots()
                    if (spot.canBeNewHexalot) {
                        island.createHexalot(spot, master)
                    }
                    island.refreshStructure()
                }
                // if (island.legal && centerOfHexalot === island.freeHexalot) {
                //     // centerOfHexalot.genome = freshGenomeFor(MASTER);
                //     island.refresh();
                //     island.save();
                // }
                break
            default:
                throw new Error("Unknown command!")
        }
    }
}

export default App
