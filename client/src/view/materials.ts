import {Color, FaceColors, LineBasicMaterial, MeshPhongMaterial} from "three"

export const GOTCHI_GHOST_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color("silver"),
    transparent: true,
    opacity: 0.6,
})

export const GOTCHI_MATERIAL = new MeshPhongMaterial({
    lights: true,
    color: new Color("silver"),
})

export const ISLAND_MATERIAL = new MeshPhongMaterial({
    vertexColors: FaceColors,
    lights: true,
})

export const HANGER_MATERIAL_OCCUPIED = new LineBasicMaterial({color: new Color("black")})

export const HOME_HEXALOT_MATERIAL = new LineBasicMaterial({color: new Color("red")})

export const HANGER_MATERIAL_FREE = new LineBasicMaterial({color: new Color("white")})

export const TRIP_MATERIAL = new LineBasicMaterial({color: new Color("crimson")})

export const GOTCHI_POINTER_MATERIAL = new LineBasicMaterial({color: new Color("magenta")})

export const USER_POINTER_MATERIAL = new LineBasicMaterial({color: new Color("yellow")})
