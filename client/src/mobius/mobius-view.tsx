import * as React from "react"

import { Tensegrity } from "../fabric/tensegrity"

export function MobiusView({createMobius}: {
    createMobius: (segments: number) => Tensegrity,
}): JSX.Element {
    return <h1>Mobius</h1>
}
