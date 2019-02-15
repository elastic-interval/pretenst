package Galapagotchi

import Galapagotchi.Vocabulary._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import spray.json.DefaultJsonProtocol._
import spray.json._

import scala.collection.BitSet

object Vocabulary {

  case class Master(name: String)

  case class IslandPattern(hex: String)

  case class HexalotPattern(cellsLit: BitSet, owner: Master)

  case class Coords(x: Int = 0, y: Int = 0)

  case class Cell(
                   coords: Coords,
                   lit: Boolean,
                   memberOfHexalot: Seq[HexalotPattern] = Seq.empty,
                   adjacentHexalots: Seq[HexalotPattern] = Seq.empty,
                   centerOfHexalot: Option[HexalotPattern] = None
                 )

  case class Spot(index: Int, coords: Coords, cellOption: Option[Cell] = None) {

    def hasLit(lit: Boolean): Boolean = cellOption.exists(cell => cell.lit == lit)

  }

  case class SpotInHexalot(
                           coords: Coords = Coords(),
                           spots: Seq[Spot] = Structure.GOTCH_SHAPE.map(c => Coords(c._1, c._2)).zipWithIndex.map(ci => Spot(ci._2, ci._1)),
                           owner: Option[Master] = None
                         ) {

    def indexOfDifference(cellsLit: BitSet): Int =
      spots.find(spot => spot.hasLit(cellsLit(spot.index))).map(_.index).getOrElse(Structure.CELL_COUNT)

  }

  case class Hexalot(
                    coords: Coords = Coords(),
                    cells: Seq[Cell] = Seq.empty,
                    occupiedSpots: Seq[SpotInHexalot] = Seq.empty,
                    availableSpots: Seq[SpotInHexalot] = Seq(SpotInHexalot())
                  ) {

    def withHexalot(hexalotPattern: HexalotPattern): Option[Hexalot] = {
      // find the hexalots with identical inner patterns ignoring the outer row
      val candidate: Option[SpotInHexalot] = availableSpots.find(tip => tip.indexOfDifference(hexalotPattern.cellsLit) >= Structure.INNER_CELL_COUNT)
      candidate.flatMap { candidate =>
        if (candidate.indexOfDifference(hexalotPattern.cellsLit) == Structure.CELL_COUNT) {
          None // there is no difference at all so this hexalot pattern already exists, sorry
        } else {
          // we have a new candidate, so create and add new cells for it
          val newCells = cells ++ candidate.spots.filter(_.cellOption.isEmpty).map { spot =>
            val offset = Structure.GOTCH_SHAPE(spot.index)
            Cell(Coords(coords.x + offset._1, coords.y + offset._2), hexalotPattern.cellsLit(spot.index))
          }
          // set the cells of those that were absent, ensuring a cell in each spot
          val spotsInHexalot = candidate.copy(spots = candidate.spots.map(spot =>
            if (spot.cellOption.isDefined)
              spot
            else
              spot.copy(cellOption = newCells.find(_.coords == spot.coords))
          ))
          // leave behind some new available spots
          val newAvailable = Structure.GOTCH_SHAPE.take(Structure.ADJACENT_COUNT).flatMap { c =>
            val center = Coords(coords.x + c._1, coords.y + c._2)
            if (occupiedSpots.exists(_.coords == center) || availableSpots.exists(_.coords == center))
              None // neither occupied nor available so sorry
            else {
              val spotCoords = Structure.GOTCH_SHAPE.map(cc => Coords(center.x + cc._1, center.y + cc._2))
              Some(SpotInHexalot(
                coords = center,
                spots = spotCoords.zipWithIndex.map(ci => Spot(ci._2, ci._1, newCells.find(_.coords == ci._1)))
              ))
            }
          }
          Some(this.copy(
            cells = newCells,
            occupiedSpots = spotsInHexalot +: occupiedSpots,
            availableSpots = availableSpots.filter(sig => sig.coords != spotsInHexalot.coords) ++ newAvailable
          ))
        }
      }
    }
  }

}

trait VocabularyJson extends SprayJsonSupport {

  implicit val hodlerJson: RootJsonFormat[Master] = jsonFormat1(Master)

  implicit val patchTokenPattern: RootJsonFormat[IslandPattern] = jsonFormat1(IslandPattern)

}
