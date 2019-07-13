# Hexalot

A **hexalot** is a unit of property on one of the *Galapagotchi* islands.  It is shaped like a hexagon, and it is made up of many spots, 127 to be precise. 

Each of the spots is either **land** or **water**, and the *gotchis* are not (yet) able to swim so they should avoid water.

![hexalot](media/hexalot.png)

No two hexalots have exactly the same pattern of spots, so it is this unique pattern that we think of as the *address*. Users own these addresses, and their personal *gotchi* has the center spot of the *hexalot* as its home.

### Overlap

It is only possible to establish a *hexalot* as a neighbor for an existing one, and when a neighbor *hexalot* is created, it almost entirely overlaps existing ones. Most of the hexagon spots of two neighbors will be shared, and only a small number of spots on the *fringe* are not shared.

When a new *hexalot* is claimed, most of the time it will involve creating a number of entirely new spots along the side where expansion takes place. We call this **terraforming** because it creates new surface. An expansion could be anywhere from 0 to 13 new spots, depending on what already exists and where the new *hexalot* is situated.

### Island rules

New *hexalots* needing to do a little *terraforming* may find that the choices between *land* and *water* for each of the new spots is not completely unrestricted.  An island is considered **legal** if all spots are legal. A *water* spot is legal only if it is not *surrounded* by water. A *land* spot is legal if there is a *land* path to the edge, it has at least 2 *land* neighbors and at least 1 *water* neighbor.
