import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera, Vector3} from "three"

import {AppStorage} from "./app-storage"
import {Direction, IFabricExports} from "./body/fabric-exports"
import {createFabricKernel, FabricKernel} from "./body/fabric-kernel"
import {Physics} from "./body/physics"
import {freshGenome, IGenomeData} from "./genetics/genome"
import {Evolution, INITIAL_JOINT_COUNT, MAX_POPULATION} from "./gotchi/evolution"
import {Island} from "./island/island"
import {IslandMode, IslandState} from "./island/island-state"
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
    orbitDistance: OrbitDistance
    islandState: IslandState
    width: number
    height: number
    left: number
    top: number
    infoPanel: boolean
}

function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

function selectSpot(spot?: Spot): object {
    return (state: IAppState) => {
        const islandStateSubject = state.island.islandStateSubject
        const nextIslandState = islandStateSubject.getValue().setSelectedSpot(spot)
        const journey = nextIslandState.selectedHexalot ? nextIslandState.selectedHexalot.journey : undefined
        islandStateSubject.next(nextIslandState)
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
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private physics: Physics
    private fabricKernel: FabricKernel

    constructor(props: IAppProps) {
        super(props)
        this.physics = new Physics(props.storage)
        this.physics.applyToFabric(props.fabricExports)
        this.fabricKernel = createFabricKernel(props.fabricExports, MAX_POPULATION, INITIAL_JOINT_COUNT)
        const subject = new BehaviorSubject<IslandState>(new IslandState(IslandMode.Visiting))
        const island = new Island("GalapagotchIsland", subject, this.fabricKernel, this.props.storage)
        this.state = {
            infoPanel: getInfoPanelMaximized(),
            orbitDistance: this.orbitDistanceSubject.getValue(),
            island,
            islandState: island.islandStateSubject.getValue(),
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
        this.subs.push(this.state.island.islandStateSubject.subscribe(islandState => this.setIslandState(islandState)))
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
                    islandState={this.state.islandState}
                    width={this.state.width}
                    height={this.state.height}
                    left={this.state.left}
                    top={this.state.top}
                    orbitDistance={this.orbitDistanceSubject}
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
                            cameraLocation={this.perspectiveCamera.position}
                            islandStateSubject={this.state.island.islandStateSubject}
                            doCommand={this.executeCommand}
                        />
                    </div>
                </div>
            </div>
        )
    }

    private setIslandState(islandState: IslandState): void {
        const homeHexalot = islandState.homeHexalot
        if (homeHexalot) {
            const spotCenters = homeHexalot.spots.map(spot => spot.center)
            const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
            this.fabricKernel.setHexalot(spotCenters, surface)
        }
        const selectedHexalot = islandState.selectedHexalot
        switch (islandState.islandMode) {
            case IslandMode.FixingIsland:
                // todo: wait until it's legal
                break
            case IslandMode.Visiting:
                location.replace("/#/")
                break
            case IslandMode.Landed:
                if (homeHexalot) {
                    this.props.storage.loadJourney(homeHexalot, this.state.island)
                    location.replace(`/#/${homeHexalot.id}`)
                    // this.setState({journey: selectedHome.journey})
                    break
                }
                break
            case IslandMode.PlanningJourney:
                if (homeHexalot && selectedHexalot) {
                    const journey = homeHexalot.journey
                    if (journey) {
                        journey.addVisit(selectedHexalot)
                    } else {
                        homeHexalot.journey = new Journey([homeHexalot, selectedHexalot])
                    }
                    this.props.storage.saveJourney(homeHexalot)
                    // todo: make the journey update?
                }
                break
            case IslandMode.PlanningDrive:
                break
            case IslandMode.Evolving:
                break
            case IslandMode.DrivingFree:
                break
            case IslandMode.DrivingJourney:
                break
            default:
                return
        }
    }

    private executeCommand = (command: Command, where?: Vector3) => {
        const island = this.state.island
        const islandStateSubject = island.islandStateSubject
        const islandState = this.state.islandState
        const homeHexalot = islandState.homeHexalot
        const gotchi = islandState.gotchi
        const journey = islandState.journey
        const selectedSpot = islandState.selectedSpot
        switch (command) {
            case Command.DETACH:
                islandStateSubject.next(islandState.setHomeToSelected())
                break
            case Command.SAVE_GENOME:
                if (homeHexalot && gotchi) {
                    console.log("Saving")
                    const genomeData = gotchi.genomeData
                    this.props.storage.setGenome(homeHexalot, genomeData)
                }
                break
            case Command.RANDOM_GENOME:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                break
            case Command.RETURN_TO_SEED:
                this.setState(selectSpot(islandState.selectedSpot))
                break
            case Command.DRIVE_FREE:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        islandStateSubject.next(islandState.setGotchi(newbornGotchi))
                    }
                }
                break
            case Command.DRIVE_JOURNEY:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        islandStateSubject.next(islandState.setGotchi(newbornGotchi, journey))
                    }
                }
                break
            case Command.EVOLVE:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (genomeData: IGenomeData) => this.props.storage.setGenome(homeHexalot, genomeData)
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        this.state.island.islandStateSubject.next(islandState.setEvolution(evolution))
                    }
                }
                break
            case Command.FORGET_JOURNEY:
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    this.props.storage.saveJourney(homeHexalot)
                    // todo: this.setState({journey: undefined})
                }
                break
            case Command.TURN_LEFT:
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    islandStateSubject.next(islandState.setSelectedSpot(homeHexalot.centerSpot))
                }
                break
            case Command.TURN_RIGHT:
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    islandStateSubject.next(islandState.setSelectedSpot(homeHexalot.centerSpot))
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
                if (selectedSpot && selectedSpot.free) {
                    islandStateSubject.next(islandState.setSurface(Surface.Land))
                    island.refreshStructure()
                }
                break
            case Command.CREATE_WATER:
                if (selectedSpot && selectedSpot.free) {
                    islandStateSubject.next(islandState.setSurface(Surface.Water))
                    island.refreshStructure()
                }
                break
            case Command.CLAIM_HEXALOT:
                if (selectedSpot) {
                    island.removeFreeHexalots()
                    if (selectedSpot.available) {
                        const hexalot = island.createHexalot(selectedSpot)
                        if (hexalot) {
                            hexalot.refreshFingerprint()
                            this.props.storage.setGenome(hexalot, freshGenome().genomeData)
                            islandStateSubject.next(islandState.setHomeToSelected())
                        }
                    }
                    island.refreshStructure()
                    island.save()
                }
                break
            default:
                throw new Error("Unknown command!")
        }
    }
}

export default App
