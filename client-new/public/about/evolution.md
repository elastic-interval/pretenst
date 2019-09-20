# Evolution

The *Galapagotchi* evolve by mutation and natural selection, where fitness is a measure of how close the running body gets to its destination by a given age. There is no sexual recombination of genes, so the bodies are more like *single-cell organisms* finding their way to food.

### Multiverse

In a physics simulation it is much harder to detect all *collisions* in space than to ignore them. The simple physics of *Galapagotchi* operate on individual bodies, so there is no programmed interaction *between* bodies. This means that nothing prevents them from being in the *same place at the same time*.

![multiverse evolution](media/multiverse-evolution.png)

We call it **multiverse evolution** because the ghostly bodies can effortlessly superimpose, which vaguely echoes the model in quantum physics where many universes exist in parallel. For *Galapagotchi* it is a welcome simplification for the physics, but more importantly it is an intuitive way to visually experience evolutionary competition between peers.

The *evolution* process only forgets the slowest runners, so you don't have to be the best, you just have to avoid being among the worst. (*Demise of the Least Fit* is a better slogan than *Survival of the Fittest*).

### Blind watchmaker

For the evolution to be **blind**, there must be an unmistakable disconnect between how the *mutation* happens and how *fitness* is judged.

![blind](media/blind.png)

Mutations in *Galapagotchi* are tosses of [dice](gene.md), where a single number in a long sequence of numbers *1 to 6* is randomly changed. The effects of a mutation on a body's ability to run are very unpredictable.

A mutation might cause a single [muscle](muscle.md) pair to become *longer* and *shorter* at a different time in the cycle. The body with mutated genes will probably be *less* proficient at running than its parent, but sometimes the child exceeds its parent. The algorithm **cherishes lucky accidents**, and ruthlessly culls failures.

### Algorithm structure

The evolution algorithm has a specific **structure**, developed through trial and error, and the current structure seems to work well enough. Future development may lead to a better way, and *tinkerers* are invited to try variations.

The algorithm involves having the bodies prove again and again that they are better runners than others, reaching ever further. In a *sweeping* or *combing* action, the genes are refined, generation after generation.

![birth](media/birth-collage.png)

Starting at **age zero** a first generation is launched, and bodies emerge and fall to the surface where they start their running competition. 

Each generation is designed so that the competing bodies are allowed to reach a certain **maximum age** before they have their fitness judged. Upon reaching this age, the *slowest third* of the population of peers is forgotten (deleted), and the surviving members are randomly chosen to be *parents of the next generation* to fill the empty slots.

Every next generation starts at exactly the same *age* as the previous one, so initially they start from *age zero*, again and again. This will initially evolve gene for the [forward direction](sense.md), until the first leg of the [journey](journey.md) is completed. The subsequent legs of the journey may involve a turn to the left or right, so evolving [genes for turning](gene.md) comes next.

It is possible to ride a *Galapagotchi* along its [journey](journey.md) and then at a certain point to **stop** and initiate a *midlife evolution*. This is one of the few opportunities for the user to *play God* a bit, by deciding when to stop and evolve. The reason for choosing a particular moment might be that the next leg of the journey involves a **turn**, and it is useful to start from an age that has already brought the *gotchi* close to that challenge.

### Mutation

When a *Galapagotchi* gives birth, it uses genes which started as a *precise copy* of their own, so if a parent can run at all, its offspring will probably also have almost the same ability. The offspring genes are **slightly damaged**, which involves periodically tossing a few of the [gene's dice](gene.md) during the *gotchi's* lifetime. 

Mutations happen during the life of the body because mutations need to happen to the specific genes for the [direction](sense.md) that the current competition is about. For example, if the *gotchis* are competing to run *forward*, it is the forward genes that must be mutated. The other direction genes are *dormant* until other directions come into play.

### Generations of increasing age

The next generation *increases the maximum age* that the *gotchis* live before they are judged, so future generations get more time to prove their ability. This element of the evolution algorithm is a tradeoff.

![increasing age](media/increasing-age.png)

**Longer** generations take more time, so starting with shorter generations speeds things up. **Shorter** generations may favor bodies which make an initial successful leap forward, but then topple or fail somehow later in life. It starts with quicker generations and later filters for sustained abilities.

At the end of each generation, the [genes](gene.md) of the fastest runner are persisted and become the future starting point.
