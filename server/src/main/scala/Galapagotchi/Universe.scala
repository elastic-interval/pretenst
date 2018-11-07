package Galapagotchi

import akka.actor.SupervisorStrategy.Resume
import akka.actor.{Actor, ActorLogging, OneForOneStrategy, Props}

object Universe {

  def props: Props = Props[Universe]

}

class Universe extends Actor with ActorLogging {

  override def supervisorStrategy: OneForOneStrategy = OneForOneStrategy() {
    case e: Exception =>
      log.error(e, e.getMessage)
      Resume
  }

  override def receive: Receive = {
    case "hello" =>
      sender() ! "hi there!"
  }
}
