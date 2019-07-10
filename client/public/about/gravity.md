# Gravity

Running is about a body interacting with a **surface** in the context of **gravity**. It turns out that gravity is quite meaningless without the surface, and that the physics of reacting to the surface is one of the more complicated bits of code.

At first glance, gravity is nothing more than an acceleration *downward* which must be added to all of the [joints](joint.md) during every cycle of [time](time.md)

* finish this

So now we have a 3D movie of some kind of dance of *intervals* and *joints*, and it acts like a network of springs. Structures built like this wobble around until they more or less come to rest, depending on how hard the *intervals* push and pull. But so far, they will only float in space. There is no gravity!

Now adding gravity doesn't sound hard. We have the day/night cycle and we can just nudge every joint in a "down" direction during the night. The real challenge is the other side of the story: the ground. Falling is not enough, because you need something to fall on. So, again, since we need a surface to oppose gravity, we look for the simplest way possible.

Whenever a joint goes below the surface, we need to push it back upwards. If we want a solid surface, we had better push up with significant force! So that's exactly what we do, add a force ray upwards to every *joint* that finds itself below. There are some details about this which we gloss over for now but this is the idea, and we will get to the details later.

  