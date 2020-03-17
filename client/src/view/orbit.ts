
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as THREE from "three"
import { Matrix4, PerspectiveCamera } from "three"

const STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY: 4,
    TOUCH_PAN: 5,
}

const CHANGE_EVENT = {type: "change"}
const START_EVENT = {type: "start"}
const END_EVENT = {type: "end"}
const EPS = 0.000001

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author nicolaspanel / http://github.com/nicolaspanel
 *
 * This set of controls performs orbiting, dollying (zooming), and panning.
 * Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
 *    Orbit - left mouse / touch: one finger move
 *    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
 *    Pan - right mouse, or arrow keys / touch: three finger swipe
 */
export class Orbit extends THREE.EventDispatcher {
    public object: PerspectiveCamera
    public element: HTMLElement
    public window: Window

    // API
    public enabled: boolean
    public target: THREE.Vector3

    public enableZoom: boolean
    public zoomSpeed: number
    public minDistance: number
    public maxDistance: number
    public enableRotate: boolean
    public rotateSpeed: number
    public enablePan: boolean
    public keyPanSpeed: number
    public autoRotate: boolean
    public autoRotateSpeed: number
    public minZoom: number
    public maxZoom: number
    public minPolarAngle: number
    public maxPolarAngle: number
    public minAzimuthAngle: number
    public maxAzimuthAngle: number
    public keys: { LEFT: number; UP: number; RIGHT: number; BOTTOM: number; }
    public mouseButtons: { ORBIT: THREE.MOUSE; ZOOM: THREE.MOUSE; PAN: THREE.MOUSE; }
    public enableDamping: boolean
    public dampingFactor: number

    private readonly spherical: THREE.Spherical
    private sphericalDelta: THREE.Spherical
    private scale: number
    private readonly target0: THREE.Vector3
    private readonly position0: THREE.Vector3
    private readonly zoom0: number
    private state: number
    private readonly panOffset: THREE.Vector3
    private zoomChanged: boolean

    private readonly rotateStart: THREE.Vector2
    private readonly rotateEnd: THREE.Vector2
    private rotateDelta: THREE.Vector2

    private readonly panStart: THREE.Vector2
    private readonly panEnd: THREE.Vector2
    private panDelta: THREE.Vector2

    private readonly dollyStart: THREE.Vector2
    private readonly dollyEnd: THREE.Vector2
    private dollyDelta: THREE.Vector2

    private updateLastPosition: THREE.Vector3
    private readonly updateOffset: THREE.Vector3
    private readonly updateQuat: THREE.Quaternion
    private updateLastQuaternion: THREE.Quaternion
    private readonly updateQuatInverse: THREE.Quaternion

    private readonly panLeftV: THREE.Vector3
    private readonly panUpV: THREE.Vector3
    private panInternalOffset: THREE.Vector3

    private readonly onMouseUp: EventListener
    private readonly onMouseDown: EventListener
    private readonly onMouseMove: EventListener
    private readonly onMouseWheel: EventListener
    private readonly onTouchStart: EventListener
    private readonly onTouchEnd: EventListener
    private readonly onTouchMove: EventListener

    constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
        super()
        if (!camera) {
            throw new Error("WTF no camera?")
        }
        this.object = camera
        this.element = element
        this.window = window

        // Set to false to disable this control
        this.enabled = true

        // "target" sets the location of focus, where the object orbits around
        this.target = new THREE.Vector3()

        // How far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = 0
        this.maxDistance = Infinity

        // How far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = 0
        this.maxZoom = Infinity

        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        this.minPolarAngle = 0 // radians
        this.maxPolarAngle = Math.PI // radians

        // How far you can orbit horizontally, upper and lower limits.
        // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
        this.minAzimuthAngle = -Infinity // radians
        this.maxAzimuthAngle = Infinity // radians

        // Set to true to enable damping (inertia)
        // If damping is enabled, you must call controls.update() in your animation loop
        this.enableDamping = false
        this.dampingFactor = 0.25

        // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
        // Set to false to disable zooming
        this.enableZoom = true
        this.zoomSpeed = 1.0

        // Set to false to disable rotating
        this.enableRotate = true
        this.rotateSpeed = 1.0

        // Set to false to disable panning
        this.enablePan = true
        this.keyPanSpeed = 7.0	// pixels moved per arrow key push

        // Set to true to automatically rotate around the target
        // If auto-rotate is enabled, you must call controls.update() in your animation loop
        this.autoRotate = false
        this.autoRotateSpeed = 2.0 // 30 seconds per round when fps is 60

        // The four arrow keys
        this.keys = {LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40}

        // Mouse buttons
        this.mouseButtons = {ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT}

        // for reset
        this.target0 = this.target.clone()
        this.position0 = this.object.position.clone()
        this.zoom0 = (this.object as PerspectiveCamera).zoom

        // for update speedup
        this.updateOffset = new THREE.Vector3()
        // so camera.up is the orbit axis
        this.updateQuat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0))
        this.updateQuatInverse = this.updateQuat.clone().inverse()
        this.updateLastPosition = new THREE.Vector3()
        this.updateLastQuaternion = new THREE.Quaternion()

        this.state = STATE.NONE
        this.scale = 1

        // current position in spherical coordinates
        this.spherical = new THREE.Spherical()
        this.sphericalDelta = new THREE.Spherical()

        this.panOffset = new THREE.Vector3()
        this.zoomChanged = false

        this.rotateStart = new THREE.Vector2()
        this.rotateEnd = new THREE.Vector2()
        this.rotateDelta = new THREE.Vector2()

        this.panStart = new THREE.Vector2()
        this.panEnd = new THREE.Vector2()
        this.panDelta = new THREE.Vector2()

        this.dollyStart = new THREE.Vector2()
        this.dollyEnd = new THREE.Vector2()
        this.dollyDelta = new THREE.Vector2()

        this.panLeftV = new THREE.Vector3()
        this.panUpV = new THREE.Vector3()
        this.panInternalOffset = new THREE.Vector3()

        // event handlers - FSM: listen for events and reset state

        this.onMouseDown = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            if (event.button === this.mouseButtons.ORBIT) {
                if (!this.enableRotate) {
                    return
                }
                this.rotateStart.set(event.clientX, event.clientY)
                this.state = STATE.ROTATE
            } else if (event.button === this.mouseButtons.ZOOM) {
                if (!this.enableZoom) {
                    return
                }
                this.dollyStart.set(event.clientX, event.clientY)
                this.state = STATE.DOLLY
            } else if (event.button === this.mouseButtons.PAN) {
                if (!this.enablePan) {
                    return
                }
                this.panStart.set(event.clientX, event.clientY)
                this.state = STATE.PAN
            }
            if (this.state !== STATE.NONE) {
                document.addEventListener("mousemove", this.onMouseMove, false)
                document.addEventListener("mouseup", this.onMouseUp, false)
                this.dispatchEvent(START_EVENT)
            }
        }

        this.onMouseMove = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            if (this.state === STATE.ROTATE) {
                if (!this.enableRotate) {
                    return
                }
                this.rotateEnd.set(event.clientX, event.clientY)
                this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)
                // rotating across whole screen goes 360 degrees around
                this.rotateLeft(2 * Math.PI * this.rotateDelta.x / this.element.clientWidth * this.rotateSpeed)
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * this.rotateDelta.y / this.element.clientHeight * this.rotateSpeed)
                this.rotateStart.copy(this.rotateEnd)

                this.update()
            } else if (this.state === STATE.DOLLY) {

                if (!this.enableZoom) {
                    return
                }

                this.dollyEnd.set(event.clientX, event.clientY)
                this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart)

                if (this.dollyDelta.y > 0) {
                    this.dollyIn(this.getZoomScale())
                } else if (this.dollyDelta.y < 0) {
                    this.dollyOut(this.getZoomScale())
                }

                this.dollyStart.copy(this.dollyEnd)
                this.update()
            } else if (this.state === STATE.PAN) {

                if (!this.enablePan) {
                    return
                }

                this.panEnd.set(event.clientX, event.clientY)
                this.panDelta.subVectors(this.panEnd, this.panStart)
                this.pan(this.panDelta.x, this.panDelta.y)
                this.panStart.copy(this.panEnd)
                this.update()
            }
        }

        this.onMouseUp = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            document.removeEventListener("mousemove", this.onMouseMove, false)
            document.removeEventListener("mouseup", this.onMouseUp, false)

            this.dispatchEvent(END_EVENT)
            this.state = STATE.NONE
        }

        this.onMouseWheel = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled || !this.enableZoom || (this.state !== STATE.NONE && this.state !== STATE.ROTATE)) {
                return
            }
            event.stopPropagation()
            if (event.deltaY < 0) {
                this.dollyOut(this.getZoomScale())
            } else if (event.deltaY > 0) {
                this.dollyIn(this.getZoomScale())
            }
            this.update()
            this.dispatchEvent(START_EVENT) // not sure why these are here...
            this.dispatchEvent(END_EVENT)
        }

        this.onTouchStart = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            switch (event.touches.length) {
                // one-fingered touch: rotate
                case 1: {
                    if (!this.enableRotate) {
                        return
                    }
                    this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY)
                    this.state = STATE.TOUCH_ROTATE
                }
                    break
                // two-fingered touch: dolly
                case 2: {
                    if (!this.enableZoom) {
                        return
                    }

                    const dx = event.touches[0].pageX - event.touches[1].pageX
                    const dy = event.touches[0].pageY - event.touches[1].pageY

                    const distance = Math.sqrt(dx * dx + dy * dy)
                    this.dollyStart.set(0, distance)
                    this.state = STATE.TOUCH_DOLLY
                }
                    break
                // three-fingered touch: pan
                case 3: {
                    if (!this.enablePan) {
                        return
                    }

                    this.panStart.set(event.touches[0].pageX, event.touches[0].pageY)
                    this.state = STATE.TOUCH_PAN
                }
                    break
                default: {
                    this.state = STATE.NONE
                }
            }

            if (this.state !== STATE.NONE) {
                this.dispatchEvent(START_EVENT)
            }
        }

        this.onTouchMove = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            switch (event.touches.length) {
                // one-fingered touch: rotate
                case 1: {
                    if (!this.enableRotate) {
                        return
                    }
                    if (this.state !== STATE.TOUCH_ROTATE) {
                        return
                    } // is this needed?...

                    this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY)
                    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)

                    // rotating across whole screen goes 360 degrees around
                    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / this.element.clientWidth * this.rotateSpeed)

                    // rotating up and down along whole screen attempts to go 360, but limited to 180
                    this.rotateUp(2 * Math.PI * this.rotateDelta.y / this.element.clientHeight * this.rotateSpeed)

                    this.rotateStart.copy(this.rotateEnd)

                    this.update()
                }
                    break
                // two-fingered touch: dolly
                case 2: {
                    if (!this.enableZoom) {
                        return
                    }
                    if (this.state !== STATE.TOUCH_DOLLY) {
                        return
                    } // is this needed?...

                    const dx = event.touches[0].pageX - event.touches[1].pageX
                    const dy = event.touches[0].pageY - event.touches[1].pageY

                    const distance = Math.sqrt(dx * dx + dy * dy)

                    this.dollyEnd.set(0, distance)

                    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart)

                    if (this.dollyDelta.y > 0) {
                        this.dollyOut(this.getZoomScale())
                    } else if (this.dollyDelta.y < 0) {
                        this.dollyIn(this.getZoomScale())
                    }

                    this.dollyStart.copy(this.dollyEnd)
                    this.update()
                }
                    break
                // three-fingered touch: pan
                case 3: {
                    if (!this.enablePan) {
                        return
                    }
                    if (this.state !== STATE.TOUCH_PAN) {
                        return
                    } // is this needed?...
                    this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY)
                    this.panDelta.subVectors(this.panEnd, this.panStart)
                    this.pan(this.panDelta.x, this.panDelta.y)
                    this.panStart.copy(this.panEnd)
                    this.update()
                }
                    break
                default: {
                    this.state = STATE.NONE
                }
            }
        }

        this.onTouchEnd = (event: IThreeEvent) => {
            event.preventDefault()
            if (!this.enabled) {
                return
            }
            this.dispatchEvent(END_EVENT)
            this.state = STATE.NONE
        }

        this.element.addEventListener("mousedown", this.onMouseDown, {capture: true})
        this.element.addEventListener("wheel", this.onMouseWheel, {capture: true})
        this.element.addEventListener("touchstart", this.onTouchStart, {capture: true})
        this.element.addEventListener("touchend", this.onTouchEnd, {capture: true})
        this.element.addEventListener("touchmove", this.onTouchMove, {capture: true})

        // force an update at start
        this.update()
    }

    public update(): boolean {
        const position = this.object.position
        this.updateOffset.copy(position).sub(this.target)

        // rotate offset to "y-axis-is-up" space
        this.updateOffset.applyQuaternion(this.updateQuat)

        // angle from z-axis around y-axis
        this.spherical.setFromVector3(this.updateOffset)

        if (this.autoRotate && this.state === STATE.NONE) {
            this.rotateLeft(this.getAutoRotationAngle())
        }

        this.spherical.theta += this.sphericalDelta.theta
        this.spherical.phi += this.sphericalDelta.phi

        // restrict theta to be between desired limits
        this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta))

        // restrict phi to be between desired limits
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))

        this.spherical.makeSafe()

        this.spherical.radius *= this.scale

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))

        // move target to panned location
        this.target.add(this.panOffset)

        this.updateOffset.setFromSpherical(this.spherical)

        // rotate offset back to "camera-up-vector-is-up" space
        this.updateOffset.applyQuaternion(this.updateQuatInverse)

        position.copy(this.target).add(this.updateOffset)

        this.object.lookAt(this.target)

        if (this.enableDamping) {

            this.sphericalDelta.theta *= (1 - this.dampingFactor)
            this.sphericalDelta.phi *= (1 - this.dampingFactor)

        } else {

            this.sphericalDelta.set(0, 0, 0)

        }

        this.scale = 1
        this.panOffset.set(0, 0, 0)

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (this.zoomChanged ||
            this.updateLastPosition.distanceToSquared(this.object.position) > EPS ||
            8 * (1 - this.updateLastQuaternion.dot(this.object.quaternion)) > EPS) {

            this.dispatchEvent(CHANGE_EVENT)
            this.updateLastPosition.copy(this.object.position)
            this.updateLastQuaternion.copy(this.object.quaternion)
            this.zoomChanged = false
            return true
        }
        return false
    }

    public panLeft(distance: number, objectMatrix: Matrix4): void {
        this.panLeftV.setFromMatrixColumn(objectMatrix, 0) // get X column of objectMatrix
        this.panLeftV.multiplyScalar(-distance)
        this.panOffset.add(this.panLeftV)
    }

    public panUp(distance: number, objectMatrix: Matrix4): void {
        this.panUpV.setFromMatrixColumn(objectMatrix, 1) // get Y column of objectMatrix
        this.panUpV.multiplyScalar(distance)
        this.panOffset.add(this.panUpV)
    }

    // deltaX and deltaY are in pixels; right and down are positive
    public pan(deltaX: number, deltaY: number): void {
        const element: HTMLElement = this.element as HTMLElement

        const position = this.object.position
        this.panInternalOffset.copy(position).sub(this.target)
        let targetDistance = this.panInternalOffset.length()

        // half of the fov is center to top of screen
        targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0)

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix)
        this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix)
    }

    public dollyIn(dollyScale: number): void {
        this.scale /= dollyScale
    }

    public dollyOut(dollyScale: number): void {
        this.scale *= dollyScale
    }

    public getAutoRotationAngle(): number {
        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed
    }

    public getZoomScale(): number {
        return Math.pow(0.95, this.zoomSpeed)
    }

    public rotateLeft(angle: number): void {
        this.sphericalDelta.theta -= angle
    }

    public rotateUp(angle: number): void {
        this.sphericalDelta.phi -= angle
    }

    public getPolarAngle(): number {
        return this.spherical.phi
    }

    public getAzimuthalAngle(): number {
        return this.spherical.theta
    }

    public dispose(): void {
        this.element.removeEventListener("mousedown", this.onMouseDown, false)
        this.element.removeEventListener("wheel", this.onMouseWheel, false)
        this.element.removeEventListener("touchstart", this.onTouchStart, false)
        this.element.removeEventListener("touchend", this.onTouchEnd, false)
        this.element.removeEventListener("touchmove", this.onTouchMove, false)
        document.removeEventListener("mousemove", this.onMouseMove, false)
        document.removeEventListener("mouseup", this.onMouseUp, false)
    }

    public reset(): void {
        this.target.copy(this.target0)
        this.object.position.copy(this.position0)
        this.object.zoom = this.zoom0
        this.object.updateProjectionMatrix()
        this.dispatchEvent(CHANGE_EVENT)
        this.update()
        this.state = STATE.NONE
    }
}

interface ITouch {
    pageX: number
    pageY: number
}

interface IThreeEvent extends Event {
    clientX: number
    clientY: number
    deltaY: number
    button: THREE.MOUSE
    touches: ITouch[]
    keyCode: number
}
