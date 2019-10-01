# The Interval

The first thing to understand is the **interval**, because in reality it's the main character of the *Galapagotchi* story. 

What you should first imagine is a *spring*, but more one which gets thinner down to its ends, even thinning down to a point. 

Taking it into the **abstract**, an *interval* is a thing which either *pushes* or *pulls*, depending on whether it's length is shorter or longer than its preferred length.

![spring](media/spring-to-interval.jpg)

This introduces two other things that we must look at.

Pushing and pulling are things that can only take place in the context of some kind of [time](time.md). The pushes and pulls must act on something which moves as a result.

The star shapes in the diagrams represent the ends of the intervals, which are placeholders we call [joints](joint.md). The joints are where the intervals meet, when more than one *interval end* comes together. 

![triangle](media/triangle.jpg)

When intervals are connected at their ends via [joints](joint.md) it becomes possible to [grow](growth.md) spatial structure, starting with the triangle.
  
### Code

An interval in the code takes care of the following bits of information:

* indexes pointing to two [joints](joint.md)
* current ideal span (floating point 32 bit)
* the [muscle](muscle.md) behavior for each direction 
