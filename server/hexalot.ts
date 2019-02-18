import { Router } from "express"


const router = Router()

router.get("/", async (req, res) => {
    // TODO: get owned hexalots
})

router.post("/", (req, res) => {
    // TODO: purchase hexalot
    res.end("PURCHASE")
})

export default router
