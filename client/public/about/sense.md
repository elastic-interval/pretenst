# Sense of direction

A *Galapagotchi* does not have eyes or other normal senses, but rather it has *only* a sense of direction. Like a biological organism knows how to move toward food, a *gotchi* knows just enough to complete its [journey](journey.md) by going from one [hexalot](hexalot.md) visit to the next.

![directions](media/directions.png)

If the next target location in the [journey](journey.md) is to the right, for example, the *gotchi* will recognize this fact soon enough. Every [time](time.md) sweep, it checks again to see if the direction has changed.

To avoid decisions oscillating back and forth, the gotchi keeps track of recent sensed directions and updates its direction less often by taking the majority of the recent measurements.

The *gotchi* acts on its sensory information by switching from one direction [gene](gene.md) to another.