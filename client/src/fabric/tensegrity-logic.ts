import { IntervalRole, isPushRole } from "./eig-util"
import { IInterval, IJoint } from "./tensegrity-types"

export interface IJointPair {
    alpha: IJoint
    omega: IJoint
}

export type IntervalRoleFilter = (a: IntervalRole, b: IntervalRole, hasPush: boolean) => boolean

export function pullCandidates(intervals: IInterval[], joints: IJoint[], include: IntervalRoleFilter): IJointPair[] {
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

    function oppositeJoints(a: IInterval, b: IInterval): { pair: IJointPair, common: IJoint } {
        if (a.alpha.index === b.alpha.index) {
            return {pair: {alpha: a.omega, omega: b.omega}, common: a.alpha}
        } else if (a.alpha.index === b.omega.index) {
            return {pair: {alpha: a.omega, omega: b.alpha}, common: a.alpha}
        } else if (a.omega.index === b.alpha.index) {
            return {pair: {alpha: a.alpha, omega: b.omega}, common: a.omega}
        } else if (a.omega.index === b.omega.index) {
            return {pair: {alpha: a.alpha, omega: b.alpha}, common: a.omega}
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
                    const {pair, common} = oppositeJoints(a, b)
                    if (!include(a.intervalRole, b.intervalRole, !!common.push)) {
                        return
                    }
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
