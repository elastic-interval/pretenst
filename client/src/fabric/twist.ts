import { FaceName, IFace, IInterval, IPercent, Spin } from "./tensegrity-types"

export class Twist {

    constructor(
        public readonly spin: Spin,
        public readonly scale: IPercent,
        public readonly faces: IFace[],
        public readonly pushes: IInterval[],
        public readonly pulls: IInterval[],
    ) {
    }

    public face(faceName: FaceName): IFace {
        switch (this.faces.length) {
            case 2:
                switch (faceName) {
                    case FaceName.a:
                        return this.faces[0]
                    case FaceName.A:
                        return this.faces[1]
                }
                break
            case 8: // aBCDbcdA
                switch (faceName) {
                    case FaceName.a: // a
                        return this.faces[0]
                    case FaceName.B: // B
                        return this.faces[2]
                    case FaceName.C: // C
                        return this.faces[1]
                    case FaceName.D: // D
                        return this.faces[3]
                    case FaceName.b: // b
                        return this.faces[4]
                    case FaceName.c: // c
                        return this.faces[5]
                    case FaceName.d: // d
                        return this.faces[6]
                    case FaceName.A: // A
                        return this.faces[7]
                }
                break
        }
        throw new Error(`Face ${FaceName[faceName]} not found in twist with ${this.faces.length} faces`)
    }
}
