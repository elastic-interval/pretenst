import { Router } from "express"


const router = Router()

router.get("/", async (req, res) => {
    // TODO: get owned hexalots
    const {pubkey, signature} = req.query
    console.log(JSON.stringify({pubkey, signature}))
})

router.post("/", (req, res) => {
    // TODO: purchase hexalot
    res.end("PURCHASE")
})

export default router
