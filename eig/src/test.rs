#[cfg(test)]
mod tests {
    use crate::fabric::Fabric;
    use crate::interval::Interval;
    use crate::sphere::SphereScaffold;
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
    fn spheres() {
        for frequency in 1..10 {
            test_sphere(frequency, frequency * frequency * 10 + 2)
        }
    }

    fn test_sphere(frequency: usize, expect_count: usize) {
        let mut scaffold = SphereScaffold::new(frequency, 1.0);
        scaffold.generate();
        assert_eq!(scaffold.vertex.len(), expect_count);
        check_adjacent(&mut scaffold);
    }

    fn check_adjacent(scaffold: &mut SphereScaffold) {
        scaffold.vertex.iter().enumerate().for_each(|(index, vertex)| {
            if index < 12 {
                assert_eq!(vertex.adjacent.len(), 5);
            } else {
                assert_eq!(vertex.adjacent.len(), 6);
            }
        });
    }
}