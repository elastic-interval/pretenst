package PatchTokens

import PatchTokens.Vocabulary._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import spray.json.DefaultJsonProtocol._
import spray.json._

import scala.collection.BitSet

object Vocabulary {

  case class Hodler(name: String)

  case class PatchTokenPattern(hex: String)

  case class Coords(x: Int = 0, y: Int = 0)

  case class Cell(
                   coords: Coords,
                   lit: Boolean,
                   memberOfToken: Seq[PatchToken] = Seq.empty,
                   adjacentTokens: Seq[PatchToken] = Seq.empty,
                   centerOfToken: Option[PatchToken] = None
                 )

  case class PatchToken(cellsLit: BitSet, owner: Hodler)

  case class Spot(index: Int, coords: Coords, cellOption: Option[Cell] = None) {

    def hasLit(lit: Boolean): Boolean = cellOption.exists(cell => cell.lit == lit)

  }

  case class TokenInPatch(
                           coords: Coords = Coords(),
                           spots: Seq[Spot] = Structure.PATCH_TOKEN_SHAPE.map(c => Coords(c._1, c._2)).zipWithIndex.map(ci => Spot(ci._2, ci._1)),
                           owner: Option[Hodler] = None
                         ) {

    def firstDifference(cellsLit: BitSet): Int =
      spots.find(spot => spot.hasLit(cellsLit(spot.index))).map(_.index).getOrElse(Structure.CELL_COUNT)

  }

  case class Patch(
                    coords: Coords = Coords(),
                    cells: Seq[Cell] = Seq.empty,
                    owned: Seq[TokenInPatch] = Seq.empty,
                    available: Seq[TokenInPatch] = Seq(TokenInPatch())
                  ) {

    def withPatchToken(token: PatchToken): Option[Patch] = {
      val candidate: Option[TokenInPatch] = available.find(tip => tip.firstDifference(token.cellsLit) >= Structure.INNER_CELL_COUNT)
      candidate.flatMap { candidate =>
        if (candidate.firstDifference(token.cellsLit) == Structure.CELL_COUNT) {
          None // identical
        } else {
          val newCells = cells ++ candidate.spots.filter(_.cellOption.isEmpty).map { spot =>
            val offset = Structure.PATCH_TOKEN_SHAPE(spot.index)
            Cell(Coords(coords.x + offset._1, coords.y + offset._2), token.cellsLit(spot.index))
          }
          val tokenInPatch = candidate.copy(spots = candidate.spots.map(spot =>
            if (spot.cellOption.isDefined)
              spot
            else
              spot.copy(cellOption = newCells.find(_.coords == spot.coords))
          ))
          val newAvailable = Structure.PATCH_TOKEN_SHAPE.take(Structure.ADJACENT_COUNT).flatMap { c =>
            val center = Coords(coords.x + c._1, coords.y + c._2)
            if (owned.exists(_.coords == center) || available.exists(_.coords == center))
              None
            else {
              val spotCoords = Structure.PATCH_TOKEN_SHAPE.map(cc => Coords(center.x + cc._1, center.y + cc._2))
              Some(TokenInPatch(
                coords = center,
                spots = spotCoords.zipWithIndex.map(ci => Spot(ci._2, ci._1, newCells.find(_.coords == ci._1)))
              ))
            }
          }
          Some(this.copy(
            cells = newCells,
            owned = tokenInPatch +: owned,
            available = available.filter(tip => tip.coords != tokenInPatch.coords) ++ newAvailable
          ))
        }
      }
    }
  }

}

trait VocabularyJson extends SprayJsonSupport {

  implicit val hodlerJson: RootJsonFormat[Hodler] = jsonFormat1(Hodler)

  implicit val patchTokenPattern: RootJsonFormat[PatchTokenPattern] = jsonFormat1(PatchTokenPattern)

}
