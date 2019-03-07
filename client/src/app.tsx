import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera, Vector3} from "three"

import {AppStorage} from "./app-storage"
import {Direction, IFabricExports, turn} from "./body/fabric-exports"
import {createFabricKernel, FabricKernel} from "./body/fabric-kernel"
import {Physics} from "./body/physics"
import {IGenomeData} from "./genetics/genome"
import {Evolution, INITIAL_JOINT_COUNT, MAX_POPULATION} from "./gotchi/evolution"
import {Gotchi} from "./gotchi/gotchi"
import {Hexalot} from "./island/hexalot"
import {Island, IslandState} from "./island/island"
import {Journey} from "./island/journey"
import {Spot, Surface} from "./island/spot"
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
    left: number
    top: number
    infoPanel: boolean
    actionPanel: boolean

    master?: string
    orbitDistance: OrbitDistance
    spot?: Spot
    gotchi?: Gotchi
    evolution?: Evolution
    journey?: Journey
}

function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

function recycle(state: IAppState): void {
    if (state.gotchi) {
        state.gotchi.recycle()
    }
    if (state.evolution) {
        state.evolution.recycle()
    }
}

function startEvolution(hexalot: Hexalot): object {
    return (state: IAppState, props: IAppProps) => {
        state.island.setIslandState(true, hexalot)
        recycle(state)
        const journey = hexalot.createStupidJourney()
        const saveGenome = (genomeData: IGenomeData) => {
            console.log(`Saving genome data`)
            props.storage.setGenome(hexalot, genomeData)
        }
        return {
            gotchi: undefined,
            evolution: new Evolution(hexalot, journey, saveGenome),
            journey,
        }
    }
}

function startGotchi(hexalot: Hexalot): object {
    return (state: IAppState) => {
        state.island.setIslandState(true, hexalot)
        recycle(state)
        const gotchi = hexalot.createGotchi()
        return {
            gotchi,
            evolution: undefined,
            journey: undefined,
        }
    }
}

function selectSpot(spot?: Spot): object {
    return (state: IAppState) => {
        state.island.setIslandState(false, spot ? spot.centerOfHexalot : undefined)
        recycle(state)
        return {
            actionPanel: true,
            spot,
            gotchi: undefined,
            evolution: undefined,
            journey: undefined,
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
    private perspectiveCamera: PerspectiveCamera
    private hexalotIdSubject = new BehaviorSubject<string>("")
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private selectedSpotSubject = new BehaviorSubject<Spot | undefined>(undefined)
    private islandState: BehaviorSubject<IslandState>
    private physics: Physics
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics = new Physics(props.storage)
        this.physics.applyToFabric(props.fabricExports)
        this.islandState = new BehaviorSubject<IslandState>({gotchiAlive: false})
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        this.state = {
            infoPanel: getInfoPanelMaximized(),
            actionPanel: false,
            orbitDistance: this.orbitDistanceSubject.getValue(),
            island: new Island("GalapagotchIsland", this.islandState, this.fabricKernel, this.props.storage),
            master: this.props.storage.getMaster(),
            width: window.innerWidth,
            height: window.innerHeight,
            left: window.screenLeft,
            top: window.screenTop,
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
        this.subs.push(this.hexalotIdSubject.subscribe(hexalotId => location.replace(`/#/${hexalotId}`)))
        this.subs.push(this.selectedSpotSubject.subscribe(spot => {
            if (!spot) {
                return
            }
            const hexalot = spot.centerOfHexalot
            if (!hexalot) {
                return
            }
            const homeHexalotId = this.hexalotIdSubject.getValue()
            if (homeHexalotId.length === 0) {
                this.hexalotIdSubject.next(hexalot.id)
                this.props.storage.loadJourney(hexalot, this.state.island)
                this.setState({journey: hexalot.journey})
            } else {
                if (homeHexalotId === hexalot.id) {
                    hexalot.journey = undefined
                    this.props.storage.saveJourney(hexalot)
                } else {
                    const homeHexalot = this.state.island.findHexalot(homeHexalotId)
                    if (homeHexalot) {
                        const journey = homeHexalot.journey
                        if (journey) {
                            journey.addVisit(hexalot)
                        } else {
                            homeHexalot.journey = new Journey([homeHexalot, hexalot])
                        }
                        this.props.storage.saveJourney(homeHexalot)
                        this.setState({journey: homeHexalot.journey})
                    }
                }
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
                    left={this.state.left}
                    top={this.state.top}
                    selectedSpot={this.selectedSpotSubject}
                    orbitDistance={this.orbitDistanceSubject}
                    evolution={this.state.evolution}
                    journey={this.state.journey}
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

    private executeCommand = (command: Command, where?: Vector3) => {
        const island = this.state.island
        const master = this.state.master
        const spot = this.state.spot
        const hexalot = island.islandState.getValue().selectedHexalot
        const gotchi = this.state.gotchi
        const evolution = this.state.evolution
        switch (command) {
            case Command.DETACH:
                this.selectedSpotSubject.next(undefined)
                this.hexalotIdSubject.next("")
                this.setState({journey: undefined})
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
            case Command.EVOLVE_FROM_HERE:
                if (evolution) {
                    evolution.fromHere()
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
                if (gotchi && where) {
                    gotchi.approach(where, true)
                }
                break
            case Command.GO_THERE:
                if (gotchi && where) {
                    gotchi.approach(where, false)
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
