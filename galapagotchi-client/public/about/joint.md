# The Joint

The **joints** are the actual *locations* in 3D space where intervals come together. A *joint* is not really a thing, but rather a placeholder. 

![joint](media/joint.png)

 The *joints* move according to the push and pull forces of the [intervals](interval.md) which accumulate as [time](time.md) progresses.
 
A *joint's* velocity depends on both *force* and *mass* but only *intervals* are considered to have mass, so during the first phase of the [time](time.md) cycle, each *interval* contributes to the *effective mass* of the two *joints* it touches.

During the step-by-step process [growth](growth.md) process, specific joints must be triggered for the correct *tripod* extensions to be added *bilaterally*. For this, the *joints* also have a specific *naming scheme* so they can be identified properly. For example, two *joints* opposite each other in the bilateral body have the same "tag" but a different "side" to which they belong.

### Code

Each joint in the code keeps track of these attributes: 

* location
* accumulated force
* velocity
* accumulated interval mass
* identity (laterality, tag)