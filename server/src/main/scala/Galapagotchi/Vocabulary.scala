package Galapagotchi

import Galapagotchi.Vocabulary._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import spray.json.DefaultJsonProtocol._
import spray.json._

import scala.collection.BitSet

object Vocabulary {

  case class Master(name: String)

  case class IslandPattern(hex: String)

  case class GotchPattern(cellsLit: BitSet, owner: Master)

  case class Coords(x: Int = 0, y: Int = 0)

  case class Cell(
                   coords: Coords,
                   lit: Boolean,
                   memberOfGotch: Seq[GotchPattern] = Seq.empty,
                   adjacentGotches: Seq[GotchPattern] = Seq.empty,
                   centerOfGotch: Option[GotchPattern] = None
                 )

  case class Spot(index: Int, coords: Coords, cellOption: Option[Cell] = None) {

    def hasLit(lit: Boolean): Boolean = cellOption.exists(cell => cell.lit == lit)

  }

  case class SpotInGotch(
                           coords: Coords = Coords(),
                           spots: Seq[Spot] = Structure.GOTCH_SHAPE.map(c => Coords(c._1, c._2)).zipWithIndex.map(ci => Spot(ci._2, ci._1)),
                           owner: Option[Master] = None
                         ) {

    def indexOfDifference(cellsLit: BitSet): Int =
      spots.find(spot => spot.hasLit(cellsLit(spot.index))).map(_.index).getOrElse(Structure.CELL_COUNT)

  }

  case class Gotch(
                    coords: Coords = Coords(),
                    cells: Seq[Cell] = Seq.empty,
                    occupiedSpots: Seq[SpotInGotch] = Seq.empty,
                    availableSpots: Seq[SpotInGotch] = Seq(SpotInGotch())
                  ) {

    def withGotch(gotchPattern: GotchPattern): Option[Gotch] = {
      // find the gotches with identical inner patterns ignoring the outer row
      val candidate: Option[SpotInGotch] = availableSpots.find(tip => tip.indexOfDifference(gotchPattern.cellsLit) >= Structure.INNER_CELL_COUNT)
      candidate.flatMap { candidate =>
        if (candidate.indexOfDifference(gotchPattern.cellsLit) == Structure.CELL_COUNT) {
          None // there is no difference at all so this gotch pattern already exists, sorry
        } else {
          // we have a new candidate, so create and add new cells for it
          val newCells = cells ++ candidate.spots.filter(_.cellOption.isEmpty).map { spot =>
            val offset = Structure.GOTCH_SHAPE(spot.index)
            Cell(Coords(coords.x + offset._1, coords.y + offset._2), gotchPattern.cellsLit(spot.index))
          }
          // set the cells of those that were absent, ensuring a cell in each spot
          val spotsInGotch = candidate.copy(spots = candidate.spots.map(spot =>
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
              Some(SpotInGotch(
                coords = center,
                spots = spotCoords.zipWithIndex.map(ci => Spot(ci._2, ci._1, newCells.find(_.coords == ci._1)))
              ))
            }
          }
          Some(this.copy(
            cells = newCells,
            occupiedSpots = spotsInGotch +: occupiedSpots,
            availableSpots = availableSpots.filter(sig => sig.coords != spotsInGotch.coords) ++ newAvailable
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
