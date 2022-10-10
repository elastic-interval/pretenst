; note: not all of these are currently supported by the parser

(fabric
  (name "Single Seed")
  (build (seed :left)))

(fabric
  (build
    (seed :left)
    (grow A+ 1)))

(fabric
  (build
    (seed :left)
    (scale 90%)
    (grow A- 30)
    (vulcanize :bowtie)))

(fabric
  (name "Knee")
  (surface :frozen)
  (build
    (branch
      (grow A 3)
      (grow b 3))
    (vulcanize :bowtie)))

(fabric
  (name "Tripod with Knees")
  (surface :frozen)
  (build
    (branch
      (grow A+ 5)
      (grow B+ 7 (scale 90%)
        (grow C- 5 (scale 90%)))
      (grow C+ 7 (scale 90%)
        (grow C- 5 (scale 90%)))
      (grow D+ 7 (scale 90%)
        (grow C- 5 (scale 90%))))
    (vulcanize :bowtie)))


(fabric
  (name "Zigzag")
  (seed :left-right)
  (surface :frozen)
  (build
    (branch
      (grow C- 3
        (mark A+ :end))
      (grow D- 7
        (grow B- 7)
        (grow C- 7)
        (grow D- 7)
        (grow C- 7)
        (grow D- 3)
        (mark A+ :end)))
    (pull-together :end)
    (vulcanize :bowtie)))

(fabric
  (name "Composed Tree")
  (seed :left)
  (def (subtree scale-num)
    (branch
      (grow B- 5)
      (grow C- 5)
      (grow D- 5)))
  (branch
    (grow A+ 6)
    (grow b 4 (subtree))
    (grow c 4 (subtree))
    (grow d 4 (subtree))))

(fabric
  (name "Halo by Crane")
  (features
    (gravity 50%))
  (build
    (seed :left)
    (branch
      (grow A+ 5
        (scale 92%))
      (grow B- 12
        (scale 92%)
        (mark A+ :halo-end))
      (grow D- 11
        (scale 92%)
        (mark A+ :halo-end))))
  (shape
    (pull-together :halo-end))
  (pretense))

(fabric
  (name "Headless Hug")
  (scale 105%)
  (features
    (iterations-per-frame 100)
    (push-over-pull 400%))
  (build
    (seed :left-right)
    (vulcanize :bowtie)
    (branch
      (grow A+
        (scale 95%)
        (twist 0 0 0 0 1 0 0)
        (mark A+ :legs))
      (grow B-
        (scale 95%)
        (twist 0 0 0 0 1 0 0)
        (mark A+ :legs))
      (grow A-
        (scale 90%)
        (branch
          (grow A+ 3
            (mark A+ :shoulders))
          (grow C+
            (scale 93%)
            (twist 1 0 0 0 1 0 0)
            (mark A+ :hands))))
      (grow B+
        (scale 90%)
        (branch
          (grow A+ 3
            (mark A+ :shoulders))
          (grow C+
            (scale 93%)
            (twist 1 0 0 0 1 0 0)
            (mark A+ :hands))))))
  (shape
    (pull-together :legs 5%)
    (pull-together :hands 7%)
    (pull-together :shoulders 5%))
  (pretense
    (wait 10000)
    (contract-conflicts)
    (wait 10000)
    (orient :legs)))