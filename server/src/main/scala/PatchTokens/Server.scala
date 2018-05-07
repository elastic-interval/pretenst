package PatchTokens

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Directives.{ post, _ }
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.RouteDirectives.complete
import akka.stream.ActorMaterializer
import akka.util.Timeout

import scala.concurrent.duration._
import scala.concurrent.{ Await, ExecutionContext }

object Server extends App with VocabularyJson {

  implicit val system: ActorSystem = ActorSystem("PatchTokens")
  implicit val materializer: ActorMaterializer = ActorMaterializer()
  implicit lazy val executionContext: ExecutionContext = system.dispatcher
  implicit lazy val timeout: Timeout = Timeout(5.seconds) // usually we'd obtain the timeout from the system's configuration

  lazy val routes: Route = concat(
    pathPrefix("hodler") {
      pathPrefix(Segment) { hodlerName: String =>
        concat(
          get {
            pathEnd {
              complete(s"Hello Hodler $hodlerName with tokens")
            }
          },
          post {
            entity(as[String]) { tokenHex =>
              pathEnd {
                complete(s"Purchase by $hodlerName of $tokenHex")
              }
            }
          }
        )
      }
    },
    pathPrefix("adjacent") {
      pathPrefix(Segment) { tokenHex: String =>
        get {
          pathEnd {
            complete(s"Adjacent for $tokenHex")
          }
        }
      }
    },
    pathSingleSlash {
      complete(s"Patch Token Server")
    }
  )

  Http().bindAndHandle(routes, "localhost", 8080)

  println(s"Patch Tokens server online at http://localhost:8080/")

  Await.result(system.whenTerminated, Duration.Inf)

}
