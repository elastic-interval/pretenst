import { BehaviorSubject } from "rxjs"

import { IStoredState, transition } from "../storage/stored-state"

import { switchToVersion, Version, versionFromUrl } from "./eig-util"
import { codeToTenscript, ITenscript } from "./tenscript"

const BOOTSTRAP_TENSCRIPTS = [
    "'Phi':LR()",
    "'One':L(1)",
    "'Axoneme':L(30,S95)",
    "'Knee':L(3,b3)",
    "'Jack':LR(a2,b2,c2,d2)",
    "'Snelson Star':LR(a(15,S90),b(15,S90),c(15,S90),d(15,S90))",
    "'Tripod with Knees':RL(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))",
    "'Pretenst Lander':LR(B(15,S90),C(15,S90),D(15,S90))",
    "'Zig Zag Loop':LR(d(3,MA1),c(7,b(7,d(7,d(7,d(7,d(3,MA1))))))):1=join",
    "'Bulge Ring':L(A(15,S90,MA1), a(16,S90,MA1)):1=join",
    "'Ring':L(A(19,MA1),a(18,MA1)):1=join",
    "'Convergence':LR(a1,b(15,S92,MA1),c(15,S92,MA1),d(15,S92,MA1)):1=join",
    "'Halo by Crane':L(5,S92,b(12,S92,MA1),d(11,S92,MA1)):1=join",
    "'Thick Tripod':LR(A3,B(8,MA1),C(8,MA1),D(8,MA1)):1=distance-35",
    "'Diamond':RL(a(5,b(5,b(5,b(2,MA3)),c(5,d(2,MA4))),c(5,b(5,b(2,MA1)),c(5,d(2,MA5))),d(5,b(5,b(2,MA6)),c(5,d(2,MA2)))),b(5,b(5,b(2,MA2)),d(5,c(2,MA3))),c(5,b(5,b(2,MA5)),d(5,c(2,MA6))),d(5,b(5,b(2,MA4)),d(5,c(2,MA1)))):*=join",
    "'Composed':L(6,b(4,MA1),c(4,MA1),d(4,MA1)):1=subtree(b5,c5,d5)",
    "'Equus Lunae':LR(A(16,S95,Mb0),b(16,S95,Md0),a(16,S95,Md0),B(16,Mb0,S95)):0=distance-60",
    "'Infinity':LR(a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2)):*=join",
    "'Binfinity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA3),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2)):*=join",
    "'Mobiosity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA2),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA3)):*=join",
    "'Pretenst Squared':L(a(3,MA1),A(2,MA1)):1=distance-70",
]

export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(script => {
    const tenscript = codeToTenscript(message => {
        throw new Error(`Bootstrap parse error in "${script}"! ${message}`)
    }, false, script)
    if (!tenscript) {
        throw new Error(`Unable to parse [${script}]`)
    }
    return tenscript
})

function getCodeFromUrl(): ITenscript | undefined {
    const urlCode = location.hash.substring(1)
    try {
        return codeToTenscript(message => console.error("code from URL", message), true, decodeURIComponent(urlCode))
    } catch (e) {
        console.error("Code error", e)
    }
    return undefined
}

export function getCodeToRun(state?: IStoredState): ITenscript | undefined {
    if (versionFromUrl() !== Version.Design) {
        switchToVersion(versionFromUrl())
    } else {
        const fromUrl = getCodeFromUrl()
        if (fromUrl) {
            return fromUrl
        }
        if (state) {
            if (state.demoCount >= 0) {
                return BOOTSTRAP[state.demoCount % BOOTSTRAP.length]
            }
        } else {
            return BOOTSTRAP[0]
        }
    }
    return undefined
}

export function enterDemoMode(storedState$: BehaviorSubject<IStoredState>): ITenscript {
    transition(storedState$, {demoCount: 0, fullScreen: true, rotating: true})
    return BOOTSTRAP[0]
}

export function showDemo(
    setRootTenscript:(ts: ITenscript)=> void,
    demoCount: number,
    setDemoCount: (count: number) => void,
): void {
    if (demoCount + 1 === BOOTSTRAP.length) {
        setRootTenscript(BOOTSTRAP[0])
        setDemoCount(-1)
    } else {
        setDemoCount(demoCount)
        setRootTenscript(BOOTSTRAP[demoCount])
    }
}

