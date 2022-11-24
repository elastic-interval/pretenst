#[cfg(test)]
mod tests {
    use crate::fabric::Fabric;
    use crate::interval::Interval;
    use crate::sphere::sphere_scaffold;
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
        let fab = Fabric::mitosis_example();
        assert_eq!(fab.intervals.len(), 41);
        assert_eq!(fab.intervals.iter().filter(|Interval { role, .. }| role.push).count(), 9);
    }

    #[test]
    fn small_sphere() {
        let scaffold = sphere_scaffold(1, 1.0);
        assert_eq!(scaffold.len(), 12);
        assert_eq!(scaffold[0].adjacent.len(), 5);
    }

    #[test]
    fn mid_sphere() {
        let scaffold = sphere_scaffold(2, 1.0);
        assert_eq!(scaffold.len(), 42);
        scaffold.iter().enumerate().for_each(|(index, vertex)|{
            if index < 12 {
                assert_eq!(vertex.adjacent.len(), 5);
            } else {
                assert_eq!(vertex.adjacent.len(), 6);
            }
        });
    }
}