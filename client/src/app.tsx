import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera} from "three"

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
        const nextIslandState = islandStateSubject.getValue().withSelectedSpot(spot)
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
        this.subs.push(this.state.island.islandStateSubject.subscribe(islandState => {
            const homeHexalot = islandState.homeHexalot
            if (homeHexalot) {
                const spotCenters = homeHexalot.spots.map(spot => spot.center)
                const surface = homeHexalot.spots.map(spot => spot.surface === Surface.Land)
                this.fabricKernel.setHexalot(spotCenters, surface)
                this.props.storage.loadJourney(homeHexalot, this.state.island)
                location.replace(`/#/${homeHexalot.id}`)
            } else {
                location.replace("/#/")
            }
            this.setState({islandState})
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
                    orbitDistance={this.orbitDistanceSubject}
                    clickSpot={this.clickSpot}
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
                            islandStateSubject={this.state.island.islandStateSubject}
                            doCommand={this.executeCommand}
                        />
                    </div>
                </div>
            </div>
        )
    }

    private clickSpot = (spot: Spot) => {
        const islandStateSubject = this.state.island.islandStateSubject
        const islandState = this.state.islandState
        const homeHexalot = islandState.homeHexalot
        const hexalot = spot.centerOfHexalot
        console.log("spot", islandState.islandMode)
        switch (this.state.islandState.islandMode) {
            case IslandMode.FixingIsland:
                break
            case IslandMode.Visiting:
                if (hexalot) {
                    if (!hexalot.occupied) {
                        hexalot.genome = freshGenome()
                        this.state.island.refreshStructure()
                    }
                    islandStateSubject.next(islandState.withHomeHexalot(hexalot))
                }
                break
            case IslandMode.PlanningJourney:
                console.log("Planning gets spot", homeHexalot, hexalot)
                if (homeHexalot && hexalot) {
                    const journey = homeHexalot.journey
                    if (journey) {
                        journey.addVisit(hexalot)
                    } else {
                        homeHexalot.journey = new Journey([homeHexalot, hexalot])
                    }
                    this.props.storage.saveJourney(homeHexalot)
                    // todo: make the journey update?
                }
                break
            case IslandMode.PlanningDrive:
                const target = spot.center
                const adjacent = spot.adjacentSpots.map((s, i) => ({center: s.center, index: i}))
                adjacent.sort((a, b) => target.distanceTo(a.center) - target.distanceTo(b.center))
                console.log("adjacent", adjacent)
                const top = adjacent.pop()
                if (top) {
                    console.log(`Direction: ${top.index}`)
                }
                break
            case IslandMode.DrivingFree:
                // todo: drive to the spot
                break
        }
    }

    private executeCommand = (command: Command) => {
        const island = this.state.island
        const islandStateSubject = island.islandStateSubject
        const islandState = this.state.islandState
        const homeHexalot = islandState.homeHexalot
        const gotchi = islandState.gotchi
        const journey = islandState.journey
        const selectedSpot = islandState.selectedSpot
        switch (command) {
            case Command.Logout:
                islandStateSubject.next(islandState.withHomeHexalot())
                break
            case Command.SaveGenome:
                if (homeHexalot && gotchi) {
                    console.log("Saving")
                    const genomeData = gotchi.genomeData
                    this.props.storage.setGenome(homeHexalot, genomeData)
                }
                break
            case Command.RandomGenome:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                break
            case Command.ReturnHome:
                if (homeHexalot) {
                    this.setState(selectSpot(homeHexalot.centerSpot))
                }
                break
            case Command.DriveFree:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        islandStateSubject.next(islandState.withGotchi(newbornGotchi))
                    }
                }
                break
            case Command.DriveJourney:
                if (homeHexalot) {
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        islandStateSubject.next(islandState.withGotchi(newbornGotchi, journey))
                    }
                }
                break
            case Command.Evolve:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (genomeData: IGenomeData) => this.props.storage.setGenome(homeHexalot, genomeData)
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        this.state.island.islandStateSubject.next(islandState.withEvolution(evolution))
                    }
                }
                break
            case Command.ForgetJourney:
                if (homeHexalot) {
                    homeHexalot.journey = undefined
                    this.props.storage.saveJourney(homeHexalot)
                    // todo: this.setState({journey: undefined})
                }
                break
            case Command.RotateLeft:
                if (homeHexalot) {
                    homeHexalot.rotate(true)
                    islandStateSubject.next(islandState.withSelectedSpot(homeHexalot.centerSpot))
                }
                break
            case Command.RotateRight:
                if (homeHexalot) {
                    homeHexalot.rotate(false)
                    islandStateSubject.next(islandState.withSelectedSpot(homeHexalot.centerSpot))
                }
                break
            case Command.ComeHere:
                if (gotchi) {
                    gotchi.approach(this.perspectiveCamera.position, true)
                }
                break
            case Command.GoThere:
                if (gotchi) {
                    gotchi.approach(this.perspectiveCamera.position, false)
                }
                break
            case Command.StopMoving:
                if (gotchi) {
                    gotchi.nextDirection = Direction.REST
                }
                break
            case Command.MakeLand:
                if (selectedSpot && selectedSpot.free) {
                    islandStateSubject.next(islandState.withSurface(Surface.Land))
                    island.refreshStructure()
                }
                break
            case Command.MakeWater:
                if (selectedSpot && selectedSpot.free) {
                    islandStateSubject.next(islandState.withSurface(Surface.Water))
                    island.refreshStructure()
                }
                break
            case Command.ClaimHexalot:
                if (selectedSpot) {
                    island.removeFreeHexalots()
                    if (selectedSpot.available) {
                        const hexalot = island.createHexalot(selectedSpot)
                        if (hexalot) {
                            hexalot.refreshFingerprint()
                            this.props.storage.setGenome(hexalot, freshGenome().genomeData)
                            islandStateSubject.next(islandState.withHomeHexalot(hexalot))
                        }
                    }
                    island.refreshStructure()
                    island.save()
                }
                break
            case Command.PlanJourney:
                islandStateSubject.next(islandState.withMode(IslandMode.PlanningJourney))
                break
            default:
                throw new Error("Unknown command!")
        }
    }
}

export default App
