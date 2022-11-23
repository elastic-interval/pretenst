#[cfg(test)]
mod tests {
    use crate::fabric::Fabric;
    use crate::interval::Interval;
    use crate::tenscript::parse;
    use crate::tenscript::TenscriptNode::Grow;

    #[test]
    fn simple_parse() {
        let source =
            "
            (fabric
              (build
                (seed :left)
                (grow A+ 2)))
            ";
        let fabric_plan = parse(source).unwrap();
        println!("{:?}", fabric_plan.build_phase);
        if let Grow { forward, .. } = fabric_plan.build_phase.node.unwrap() {
            assert_eq!(forward, "XX")
        } else {
            panic!("no growth!")
        }
    }

    #[test]
    fn example_fabric() {
        let fab = Fabric::example();
        assert_eq!(fab.intervals.len(), 41);
        assert_eq!(fab.intervals.iter().filter(|Interval { role, .. }| role.push).count(), 9);
    }
}