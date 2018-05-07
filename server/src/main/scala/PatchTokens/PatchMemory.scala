package PatchTokens

import PatchTokens.Vocabulary.PatchToken

case class PatchMemory(patches: Seq[Patch] = Seq.empty) {

}

case class Patch(tokens: Seq[PatchToken]) {

}

