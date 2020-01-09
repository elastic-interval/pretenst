# Tenscript

The foundation of our exploration of tensegrity is the ability to generate structures systematically. For this we have created **tenscript**, which is a minimalist language describing how to grow and connect.

## The "Brick" System

Tenscript builds tensegrities on the basis of the simplest symmetrical unit, made with 6 compression bars and 8 triangles of tension, which we tend to call the tensegrity brick. The lengths of its elements are derived from the classic irrational number, the Golden Ratio called "phi" or &phi; (1.61803398874989484820... to be more precise). When the 24 cables have length 1, the 6 bars have length &phi;.

Each of the brick's 8 triangles is given a name which allows us to specify exactly how bricks are to be connected to each other, and the names are arranged  according to their relationships. The top triangle is called "A" and its three neighbors are called "B", "C", and "D". Each one of these has an opposite triangle which is given the same letter but in lowercase, so the bottom triangle is called "a" and so on.

The smallest tenscript program is this one, generating only the brick unit:

    (0)

Bricks are by default extended in the "A" direction to make tensegrity columns of any length. This minimal program says "Build zero new bricks on the A triangle".

The other triangles are used when the structure is to branch off in the different directions, and later when they are to be connected together to make loops.

## Tension Rings

Another way to look at the tension in this single brick is to forget about the 8 triangles, but instead observe that the tension cables make up 4 intermingled rings of tension, each making a zig-zag pattern around the shape. Since the brick is a regular shape, all of these rings are identical.

We can say that each ring is like a zig-zag equator which points out four different rotation axes. Remember these rings because they come into play when we start making connections between bricks.

## Chirality or "Handedness"

The brick's triangles are divided into two groups, the right-handed and left-handed ones. This comes from how the bars are configured. To see how this works, pick a triangle and observe how the bars "spin" towards it from the inside in one direction. If you have the curl of your fingers follow the spin and your thumb pointing outwards, only one of your hands will fit on each triangle.

Triangles which share a joint are always of opposite chirality. By convention, the "A" triangle is right-handed and its opposite "a" is left-handed. The triangles touching "A", which are "B", "C", and "D" are left-handed, while their opposing triangles "b", "c" and "d" are of course right-handed, just like "A".

## Melting Together

Bricks connect together by melting triangles of opposing chirality together, turning a star-of-david shape into a regular hexagon. To melt together, the opposing tension triangles are replaced with a ring of tension capturing all 6 points, and extra connector cables are added which bind the bars of one to the bars of the next so that the bricks become one.

The tenscript program to build a two-brick tensegrity is this:

    (1)

This program says "Create 1 brick on top of the A triangle".

The new tensegrity then consists of 12 bars, where the new brick has been added to replace the "A" triangle and it is melted into the next brick's opposing "a" triangle.

## Cable Lengths

Something else also takes place when two bricks are melted together, because the new column structure has a very different shape. 



