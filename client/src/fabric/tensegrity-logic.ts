import { isPushRole } from "./eig-util"
import { IInterval, IJoint } from "./tensegrity-types"

export interface IJointPair {
    alpha: IJoint
    omega: IJoint
}

export function pullCandidates(intervals: IInterval[], joints: IJoint[]): IJointPair[] {
    const pulls = intervals.filter(({intervalRole}) => !isPushRole(intervalRole))
    const pullMap: Record<string, IJointPair> = {}

    function intervalKey(a: IJoint, b: IJoint): string {
        return `(${a.index},${b.index})`
    }

    function record(pair: IJointPair): void {
        const {alpha, omega} = pair
        pullMap[intervalKey(alpha, omega)] = pair
        pullMap[intervalKey(omega, alpha)] = pair
    }

    pulls.forEach(pull => {
        function add(joint: IJoint): void {
            if (joint.pulls) {
                joint.pulls.push(pull)
            } else {
                joint.pulls = [pull]
            }
        }

        add(pull.alpha)
        add(pull.omega)
    })
    intervals.forEach(interval => record(interval))
    const newPairs: IJointPair[] = []

    function oppositeJoints(a: IInterval, b: IInterval): IJointPair {
        if (a.alpha.index === b.alpha.index) {
            return {alpha: a.omega, omega: b.omega}
        } else if (a.alpha.index === b.omega.index) {
            return {alpha: a.omega, omega: b.alpha}
        } else if (a.omega.index === b.alpha.index) {
            return {alpha: a.alpha, omega: b.omega}
        } else if (a.omega.index === b.omega.index) {
            return {alpha: a.alpha, omega: b.alpha}
        } else {
            throw new Error("Bad pair")
        }
    }

    joints.forEach(joint => {
        const pullsHere = joint.pulls
        if (pullsHere) {
            pullsHere.forEach((a, indexA) => {
                pullsHere.forEach((b, indexB) => {
                    if (indexB <= indexA) {
                        return
                    }
                    const pair = oppositeJoints(a, b)
                    const existing = pullMap[intervalKey(pair.alpha, pair.omega)]
                    if (!existing) {
                        newPairs.push(pair)
                        if (newPairs.length > 200) {
                            throw new Error("Overload new pairs!")
                        }
                        record(pair)
                    }
                })
            })
        }
    })
    pulls.forEach(({alpha, omega}) => {
        alpha.pulls = undefined
        omega.pulls = undefined
    })
    return newPairs
}
