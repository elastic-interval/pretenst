package Galapagotchi

import Galapagotchi.Vocabulary.Gotch
import akka.actor.ActorLogging
import akka.persistence.{PersistentActor, RecoveryCompleted, SnapshotOffer}

object IslandActor {

  sealed trait Command

  case object Hello extends Command

  case class Item()

  case class AddItem(item: Item, shopperId: Long) extends Command

  sealed trait Event extends Serializable


  case class IslandSnapshot(everything: String)


}

class IslandActor extends PersistentActor with ActorLogging {

  import IslandActor._

  var patches = Seq.empty[Gotch]

  override def persistenceId: String = "island"

  override def receiveRecover: Receive = {

    case event: Event =>

    case SnapshotOffer(metadata, islandSnapshot: IslandSnapshot) =>

    case RecoveryCompleted =>
      log.info(s"Recovery complete for persistence ID: $persistenceId")
  }

  override def receiveCommand: Receive = {

    case Hello =>
      sender() ! "Hi from IslandActor"

  }

}
