package PatchTokens

import PatchTokens.Vocabulary.{Hodler, PatchTokenPattern}
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat

import scala.collection.BitSet

object Vocabulary {

  case class Hodler(name: String)

  case class PatchTokenPattern(hex: String)

  case class PatchToken(bitSet: BitSet)

}

trait VocabularyJson extends SprayJsonSupport {

  implicit val hodlerJson: RootJsonFormat[Hodler] = jsonFormat1(Hodler)

  implicit val patchTokenPattern: RootJsonFormat[PatchTokenPattern] = jsonFormat1(PatchTokenPattern)

}
