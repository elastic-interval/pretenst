import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera, Vector3} from "three"

import {AppStorage} from "./app-storage"
import {Direction, IFabricExports} from "./body/fabric-exports"
import {createFabricKernel, FabricKernel} from "./body/fabric-kernel"
import {Physics} from "./body/physics"
import {IGenomeData} from "./genetics/genome"
import {Evolution, INITIAL_JOINT_COUNT, MAX_POPULATION} from "./gotchi/evolution"
import {Gotchi} from "./gotchi/gotchi"
import {Hexalot} from "./island/hexalot"
import {Island} from "./island/island"
import {IslandMode} from "./island/island-state"
import {Journey, Leg} from "./island/journey"
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

    orbitDistance: OrbitDistance
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

function startEvolution(hexalot: Hexalot, firstLeg: Leg): object {
    return (state: IAppState, props: IAppProps) => {
        const islandState = state.island.islandState
        islandState.next(islandState.getValue().setIslandMode(IslandMode.Evolving))
        recycle(state)
        const saveGenome = (genomeData: IGenomeData) => {
            console.log(`Saving genome data`)
            props.storage.setGenome(hexalot, genomeData)
        }
        return {
            gotchi: undefined,
            evolution: new Evolution(hexalot, firstLeg, saveGenome),
            journey: firstLeg.journey,
        }
    }
}

function startDrive(hexalot: Hexalot, journey?: Journey): object {
    return (state: IAppState) => {
        const islandState = state.island.islandState
        const islandMode = state.journey ? IslandMode.DrivingJourney : IslandMode.DrivingFree
        islandState.next(islandState.getValue().setIslandMode(islandMode))
        recycle(state)
        const gotchi = hexalot.createNativeGotchi()
        return {
            gotchi,
            evolution: undefined,
            journey,
        }
    }
}

function selectSpot(spot?: Spot): object {
    return (state: IAppState) => {
        const islandState = state.island.islandState
        const nextIslandState = islandState.getValue().setSelectedSpot(spot)
        const journey = nextIslandState.selectedHexalot ? nextIslandState.selectedHexalot.journey : undefined
        islandState.next(nextIslandState)
        recycle(state)
        return {
            actionPanel: true,
            spot,
            gotchi: undefined,
            evolution: undefined,
            journey,
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
    private homeHexalot = new BehaviorSubject<Hexalot | undefined>(undefined)
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private selectedSpotSubject = new BehaviorSubject<Spot | undefined>(undefined)
    private physics: Physics
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics = new Physics(props.storage)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        this.state = {
            infoPanel: getInfoPanelMaximized(),
            orbitDistance: this.orbitDistanceSubject.getValue(),
            island: new Island("GalapagotchIsland", this.fabricKernel, this.props.storage),
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
        this.subs.push(this.state.island.islandState.subscribe(islandState => {
            const hexalot = islandState.selectedHexalot
            if (hexalot) {
                const spotCenters = hexalot.spots.map(spot => spot.center)
                const surface = hexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
            }
        }))
        this.subs.push(this.homeHexalot.subscribe((hexalot?: Hexalot) => {
            const id = hexalot ? hexalot.id : ""
            location.replace(`/#/${id}`)
        }))
        this.subs.push(this.selectedSpotSubject.subscribe(spot => {
            if (!spot) {
                return
            }
            const hexalot = spot.centerOfHexalot
            if (!hexalot) {
                return
            }
            const homeHexalot = this.homeHexalot.getValue()
            if (!homeHexalot) {
                this.homeHexalot.next(hexalot)
                this.props.storage.loadJourney(hexalot, this.state.island)
                this.setState({journey: hexalot.journey})
                return
            }
            if (homeHexalot.id !== hexalot.id) {
                const journey = homeHexalot.journey
                if (journey) {
                    journey.addVisit(hexalot)
                } else {
                    homeHexalot.journey = new Journey([homeHexalot, hexalot])
                }
                this.props.storage.saveJourney(homeHexalot)
            }
            this.setState({journey: homeHexalot.journey})
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
                    islandState={this.state.island.islandState}
                    width={this.state.width}
                    height={this.state.height}
                    left={this.state.left}
                    top={this.state.top}
                    homeHexalot={this.homeHexalot}
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
                <div className="actions-panel-outer floating-panel">
                    <div className="actions-panel-inner">
                        <ActionsPanel
                            orbitDistance={this.orbitDistanceSubject}
                            homeHexalot={this.homeHexalot}
                            cameraLocation={this.perspectiveCamera.position}
                            islandState={this.state.island.islandState}
                            doCommand={this.executeCommand}
                        />
                    </div>
                </div>
            </div>
        )
    }

    private executeCommand = (command: Command, where?: Vector3) => {
        const island = this.state.island
        const islandState = island.islandState
        const spot = islandState.getValue().selectedSpot
        const homeHexalot = this.homeHexalot.getValue()
        const gotchi = this.state.gotchi
        const journey = this.state.journey
        switch (command) {
            case Command.DETACH:
                this.selectedSpotSubject.next(undefined)
                this.homeHexalot.next(undefined)
                this.setState({journey: undefined})
                islandState.next(islandState.getValue().setIslandMode(IslandMode.Visiting))
                break
            case Command.SAVE_GENOME:
                if (homeHexalot && gotchi) {
                    console.log("Saving")
                    const genomeData = gotchi.genomeData
                    this.props.storage.setGenome(homeHexalot, genomeData)
                }
                break
            case Command.DELETE_GENOME:
                if (homeHexalot) {
                    console.log("Deleting")
                    homeHexalot.deleteGenome()
                }
                break
            case Command.RETURN_TO_SEED:
                const selectedSpot = this.selectedSpotSubject.getValue()
                this.selectedSpotSubject.next(selectedSpot) // refresh
                this.setState(selectSpot(selectedSpot))
                break
            case Command.DRIVE:
                if (homeHexalot) {
                    this.setState(startDrive(homeHexalot))
                }
                break
            case Command.EVOLVE:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        this.setState(startEvolution(homeHexalot, firstLeg))
                    }
                }
                break
            case Command.FORGET_JOURNEY:
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    this.props.storage.saveJourney(homeHexalot)
                    this.setState({journey: undefined})
                }
                break
            case Command.TURN_LEFT:
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    islandState.next(islandState.getValue().setSelectedSpot(homeHexalot.centerSpot))
                }
                break
            case Command.TURN_RIGHT:
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    islandState.next(islandState.getValue().setSelectedSpot(homeHexalot.centerSpot))
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
                    gotchi.nextDirection = Direction.REST
                }
                break
            case Command.CREATE_LAND:
                if (spot && spot.free) {
                    islandState.next(islandState.getValue().setSurface(Surface.Land))
                    island.refreshStructure()
                }
                break
            case Command.CREATE_WATER:
                if (spot && spot.free) {
                    islandState.next(islandState.getValue().setSurface(Surface.Water))
                    island.refreshStructure()
                }
                break
            case Command.CLAIM_HEXALOT:
                if (spot) {
                    island.removeFreeHexalots()
                    if (spot.canBeNewHexalot) {
                        island.createHexalot(spot)
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
