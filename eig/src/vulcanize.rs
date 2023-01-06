use std::collections::HashMap;
use crate::fabric::Fabric;
use crate::interval::{Interval, Role};
use crate::interval::Role::{BowtiePull, TwistPush, TwistRingPull, TwistVerticalPull};
use crate::interval::Span::Fixed;

impl Fabric {
    pub fn bow_tie(&mut self) {
        println!("Bow tie");
        let mut pair_bag = PairBag::new(self.joint_adjacent());
        let double_twist_pulls = self.interval_values()
            .filter(|Interval { role, .. }| *role == TwistVerticalPull);
        for Interval { alpha_index, omega_index, .. } in double_twist_pulls {
            pair_bag.add_pair_for(*alpha_index);
            pair_bag.add_pair_for(*omega_index);
        }
        // tensegrity.joints
        //     .filter(joint => joint.push && jointPulls(joint).filter(onlyA).length === 3)
        //     .forEach(joint3APush => {
        //         const noPushAcross = (interval: IInterval) => !otherJoint(joint3APush, interval).push
        //         const found = jointPulls(joint3APush).filter(onlyA).find(noPushAcross)
        //         if (!found) {
        //             throw new Error("no-push not found")
        //         }
        //         const faceJoint = otherJoint(joint3APush, found)
        //         const a3A = jointPulls(joint3APush).filter(onlyA).map(pullA => otherJoint(joint3APush, pullA))
        //             .map(end => {
        //                 const outwards = new Vector3().subVectors(instance.jointLocation(end), instance.jointLocation(joint3APush)).normalize()
        //                 return {end, outwards}
        //             })
        //         const fjA = jointPulls(faceJoint).filter(onlyA).map(pullA => otherJoint(faceJoint, pullA))
        //             .map(end => {
        //                 const outwards = new Vector3().subVectors(instance.jointLocation(end), instance.jointLocation(joint3APush)).normalize()
        //                 return {end, outwards}
        //             })
        //         a3A.map(a => {
        //             const b = fjA.sort((f1, f2) =>
        //                                a.outwards.dot(f2.outwards) - a.outwards.dot(f1.outwards))[0]
        //             const role = PULL_AA
        //             const scale = found.scale
        //             const pair: IPair = {alpha: a.end, omega: b.end, scale, role}
        //             addPair(pair)
        //         })
        //     })
        for Pair { alpha_index, omega_index, scale, role } in pair_bag.pairs.values() {
            self.create_interval(*alpha_index, *omega_index, *role, *scale);
        }
    }

    pub fn snelson(&mut self) {
        println!("Snelson");
    }

    fn joint_adjacent(&self) -> Vec<Vec<Interval>> {
        let mut maps: Vec<Vec<Interval>> = vec![vec![]; self.joints.len()];
        for interval @ Interval { alpha_index, omega_index, .. } in self.interval_values() {
            maps[*alpha_index].push(interval.clone());
            maps[*omega_index].push(interval.clone());
        }
        maps
    }
}

#[derive(Debug)]
struct Pair {
    alpha_index: usize,
    omega_index: usize,
    scale: f32,
    role: Role,
}

impl Pair {
    fn key(&self) -> (usize, usize) {
        if self.alpha_index < self.omega_index {
            (self.alpha_index, self.omega_index)
        } else {
            (self.omega_index, self.alpha_index)
        }
    }
}

struct PairBag {
    joint_intervals: Vec<Vec<Interval>>,
    pairs: HashMap<(usize, usize), Pair>,
}

impl PairBag {
    fn new(joint_intervals: Vec<Vec<Interval>>) -> Self {
        Self {
            joint_intervals,
            pairs: HashMap::new(),
        }
    }

    fn add_pair_for(&mut self, joint_index: usize) {
        match self.next_pair(joint_index) {
            None => {}
            Some(next) => self.add_pair(next)
        };
    }

    fn add_pair(&mut self, pair: Pair) {
        self.pairs.insert(pair.key(), pair);
    }

    fn next_pair(&self, near_index: usize) -> Option<Pair> {
        let pull_b = self.incident_interval(near_index, TwistVerticalPull);
        let far_index = pull_b.other_joint(near_index);
        let other_far_index = self.adjacent_joint(near_index, TwistPush);
        let other_b = self.incident_interval(other_far_index, TwistVerticalPull);
        let other_near_index = other_b.other_joint(other_far_index);
        let common = (
            self.common(near_index, other_near_index),
            self.common(far_index, other_far_index)
        );
        // const alpha = commonNear.push ? commonNear : near
        // const omega = commonFar.push ? commonFar : far
        // const scale = pullB.scale
        // const role = !commonNear.push || !commonFar.push ? pullBRole : pullARole
        // return {alpha, omega, scale, role}
        let Fixed{length ,..} = pull_b.span else {
            panic!()
        };
        match common {
            (Some(common_near), Some(common_far)) => {
                Some(Pair {
                    alpha_index: common_near,
                    omega_index: common_far,
                    scale: length * 0.5, // pull a
                    role: BowtiePull,
                })
            }
            (Some(common_near), None) => {
                let _across_far = self.across_push(far_index);
                //         if (!jointPulls(acrossFar).some(intervalJoins(commonNear, acrossFar))) {
                //             return undefined
                //         }
                Some(Pair {
                    alpha_index: common_near,
                    omega_index: far_index,
                    scale: length * 0.5, // pull b
                    role: Role::Push,
                })
            }
            (None, Some(common_far)) => {
                let _across_near = self.across_push(near_index);
                //         if (!jointPulls(acrossNear).some(intervalJoins(commonFar, acrossNear))) {
                //             return undefined
                //         }
                Some(Pair {
                    alpha_index: near_index,
                    omega_index: common_far,
                    scale: length * 0.5, // pull b
                    role: Role::Push,
                })
            }
            _ => {
                None
            }
        }
    }

    fn common(&self, index_a: usize, index_b: usize) -> Option<usize> {
        let (joints_a, joints_b) = (
            self.adjacent_joints(index_a, TwistRingPull),
            self.adjacent_joints(index_b, TwistRingPull)
        );
        let mut common: Option<usize> = None;
        for a in joints_a {
            for b in &joints_b {
                if a == *b {
                    if common.is_some() {
                        panic!("Two joints in common");
                    }
                    common = Some(a);
                }
            }
        }
        common
    }

    fn across_push(&self, index: usize) -> Option<usize> {
        self.joint_intervals[index]
            .iter()
            .find(|Interval { role, .. }| (*role).is_push())
            .map(|interval| interval.other_joint(index))
    }

    fn adjacent_joint(&self, index: usize, sought_role: Role) -> usize {
        self.incident_interval(index, sought_role).other_joint(index)
    }

    fn adjacent_joints(&self, index: usize, sought_role: Role) -> Vec<usize> {
        self.incident_intervals(index, sought_role)
            .iter()
            .map(|interval| interval.other_joint(index))
            .collect()
    }

    fn incident_interval(&self, index: usize, sought_role: Role) -> &Interval {
        let intervals = self.incident_intervals(index, sought_role);
        if intervals.len() != 1 {
            panic!()
        }
        intervals[0]
    }

    fn incident_intervals(&self, index: usize, sought_role: Role) -> Vec<&Interval> {
        self.joint_intervals[index]
            .iter()
            .filter(|Interval { role, .. }| *role == sought_role)
            .collect()
    }
}