#[cfg(test)]
mod tests {
    use std::time::Instant;
    use cgmath::{InnerSpace, Vector3};
    use cgmath::num_traits::abs;
    use crate::fabric::Fabric;
    use crate::interval::Interval;
    use crate::sphere::{SphereScaffold, Vertex};
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
        for frequency in [1, 2, 3, 10, 30, 60, 120] {
            let expect_count = frequency * frequency * 10 + 2;
            test_sphere(frequency, expect_count);
        }
    }

    fn test_sphere(frequency: usize, expect_count: usize) {
        let mut scaffold = SphereScaffold::new(frequency);
        let test_time = Instant::now();
        scaffold.generate();
        let generate_time = test_time.elapsed().as_millis();
        assert_eq!(scaffold.vertex.len(), expect_count);
        check_adjacent(&scaffold);
        let radius = 100f32;
        scaffold.set_radius(radius);
        for vertex in &scaffold.vertex {
            assert!(abs(vertex.location.magnitude() - radius) < 0.0001);
        }
        let adjacent_count = &scaffold.vertex
            .into_iter().fold(0, |count, vertex| count + vertex.adjacent.len());
        println!("freq {:?}/{:?}/{:?}: {:?}", frequency, expect_count, adjacent_count, generate_time);
    }

    fn check_adjacent(scaffold: &SphereScaffold) {
        let locations: Vec<Vector3<f32>> = scaffold.vertex.iter().map(|Vertex { location, .. }| *location).collect();
        scaffold.vertex.iter().enumerate().for_each(|(index, vertex)| {
            if index < 12 {
                assert_eq!(vertex.adjacent.len(), 5);
            } else {
                assert_eq!(vertex.adjacent.len(), 6);
            }
            let vector_to = |index: usize| (locations[index] - vertex.location).normalize();
            for current in 0..vertex.adjacent.len() {
                let next = (current + 1) % vertex.adjacent.len();
                let dot = vector_to(vertex.adjacent[current]).dot(vector_to(vertex.adjacent[next]));
                assert!(abs(dot - 0.5) < 0.0001); // neighbors are at about 60 degrees
            }
        });
    }
}