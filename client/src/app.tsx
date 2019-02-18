import * as React from "react"
import {Button} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Subscription} from "rxjs/Subscription"
import {PerspectiveCamera, Vector3} from "three"

import {AppStorage} from "./app-storage"
import {Fabric} from "./body/fabric"
import {Direction, IFabricExports, turn} from "./body/fabric-exports"
import {Physics} from "./body/physics"
import {Genome, IGenomeData} from "./genetics/genome"
import {Evolution, INITIAL_JOINT_COUNT} from "./gotchi/evolution"
import {Gotchi} from "./gotchi/gotchi"
import {Hexalot} from "./island/hexalot"
import {Island} from "./island/island"
import {Spot, Surface} from "./island/spot"
import {Trip} from "./island/trip"
import {ActionsPanel, Command} from "./view/actions-panel"
import {GotchiView} from "./view/gotchi-view"
import {InfoPanel} from "./view/info-panel"
import {OrbitDistance} from "./view/orbit"

interface IAppProps {
    createFabricInstance: (fabricNumber: number) => Promise<IFabricExports>
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
    hexalot?: Hexalot
    gotchi?: Gotchi
    evolution?: Evolution
    trip?: Trip
}

const updateDimensions = (): any => {
    return {width: window.innerWidth, height: window.innerHeight}
}

function dispose(state: IAppState) {
    if (state.gotchi) {
        state.gotchi.dispose()
    }
    if (state.evolution) {
        state.evolution.dispose()
    }
}

function startEvolution(hexalot: Hexalot) {
    return (state: IAppState, props: IAppProps) => {
        dispose(state)
        state.island.setActive(hexalot.master)
        const trip = hexalot.createStupidTrip()
        return {
            gotchi: undefined,
            evolution: new Evolution(hexalot, trip, (genomeData: IGenomeData) => {
                console.log(`Saving genome data`)
                props.storage.setGenome(hexalot, genomeData)
            }),
            trip,
        }
    }
}

function startGotchi(gotchi: Gotchi) {
    return (state: IAppState) => {
        dispose(state)
        // gotchi.travel = state.trip.createTravel(0);
        return {
            gotchi,
            evolution: undefined,
            trip: undefined,
        }
    }
}

function selectSpot(spot?: Spot) {
    const hexalot = spot ? spot.centerOfHexalot : undefined
    return (state: IAppState) => {
        dispose(state)
        state.island.setActive()
        return {
            actionPanel: true,
            spot,
            hexalot,
            gotchi: undefined,
            evolution: undefined,
            trip: undefined,
        }
    }
}

class App extends React.Component<IAppProps, IAppState> {
    private fabricCount = 0
    private subs: Subscription[] = []
    private orbitDistanceSubject = new BehaviorSubject<OrbitDistance>(OrbitDistance.HELICOPTER)
    private perspectiveCamera: PerspectiveCamera
    private selectedSpotSubject = new BehaviorSubject<Spot | undefined>(undefined)
    private islandState: BehaviorSubject<boolean>
    private physics: Physics

    constructor(props: IAppProps) {
        super(props)
        this.physics = new Physics(props.storage)
        this.islandState = new BehaviorSubject<boolean>(false)
        const createGotchiAt = (location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi> => {
            return this.props.createFabricInstance(this.fabricCount++).then(fabricExports => {
                this.physics.applyToFabric(fabricExports)
                const fabric = new Fabric(fabricExports, jointCountMax)
                fabric.createSeed(location.x, location.z)
                return new Gotchi(fabric, genome)
            })
        }
        this.state = {
            infoPanel: true,
            actionPanel: false,
            orbitDistance: this.orbitDistanceSubject.getValue(),
            island: new Island("GalapagotchIsland", this.islandState, {createGotchiAt}, this.props.storage),
            master: this.props.storage.getMaster(),
            width: window.innerWidth,
            height: window.innerHeight,
        }
        this.perspectiveCamera = new PerspectiveCamera(50, this.state.width / this.state.height, 1, 500000)
    }

    public componentDidMount() {
        window.addEventListener("resize", () => this.setState(updateDimensions))
        this.subs.push(this.selectedSpotSubject.subscribe(spot => {
            if (spot && !this.state.evolution && !this.state.gotchi) {
                this.setState(selectSpot(spot))
            }
        }))
        this.subs.push(this.orbitDistanceSubject.subscribe(orbitDistance => this.setState({orbitDistance})))
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.setState(updateDimensions))
        this.subs.forEach(s => s.unsubscribe())
    }

    public render() {
        return (
            <div className="everything">
                <GotchiView
                    perspectiveCamera={this.perspectiveCamera}
                    island={this.state.island}
                    width={this.state.width}
                    height={this.state.height}
                    selectedSpot={this.selectedSpotSubject}
                    orbitDistance={this.orbitDistanceSubject}
                    hexalot={this.state.hexalot}
                    evolution={this.state.evolution}
                    trip={this.state.trip}
                    gotchi={this.state.gotchi}
                />
                {!this.state.infoPanel ? (
                    <div className="info-panel-collapsed floating-panel">
                        <Button color="link" onClick={() => this.setState({infoPanel: true})}>?</Button>
                    </div>
                ) : (
                    <div className="info-panel floating-panel">
                        <div className="info-title">
                            <h3>Galapagotchi Run!</h3>
                            <div className="info-exit">
                                <Button color="link" onClick={() => this.setState({infoPanel: false})}>X</Button>
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
                            hexalot={this.state.hexalot}
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
        const hexalot = this.state.hexalot
        const gotchi = this.state.gotchi
        switch (command) {
            case Command.RETURN_TO_SEED:
                const selectedSpot = this.selectedSpotSubject.getValue()
                this.selectedSpotSubject.next(selectedSpot) // refresh
                this.setState(selectSpot(selectedSpot))
                break
            case Command.LAUNCH_GOTCHI:
                if (hexalot) {
                    island.setActive(hexalot.master)
                    hexalot.createGotchi(INITIAL_JOINT_COUNT).then((freshGotchi: Gotchi) => {
                        this.setState(startGotchi(freshGotchi))
                    })
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
            case Command.LAUNCH_EVOLUTION:
                if (hexalot) {
                    island.setActive(hexalot.master)
                    this.setState(startEvolution(hexalot))
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
