package PatchTokens

import akka.actor.ActorLogging
import akka.persistence.{PersistentActor, RecoveryCompleted, SnapshotOffer}

object PatchActor {

  sealed trait Command

  case object Hello extends Command

  case class Item()

  case class AddItem(item: Item, shopperId: Long) extends Command

  sealed trait Event extends Serializable


  case class PatchSnapshot(everything: String)

}

class PatchActor extends PersistentActor with ActorLogging {

  import PatchActor._

  override def persistenceId: String = "patch"

  override def receiveRecover: Receive = {

    case event: Event =>

    case SnapshotOffer(metadata, basketSnapshot: PatchSnapshot) =>

    case RecoveryCompleted =>
      log.info(s"Recovery complete for persistence ID: $persistenceId")
  }

  override def receiveCommand: Receive = {

    case Hello =>
      sender() ! "Hi from PatchActor"

  }

}
