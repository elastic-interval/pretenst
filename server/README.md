

### Run

You can substitute npm for yarn

`yarn install`
`yarn run start`

### Test

Using [HTTPie](https://httpie.org/)

To test purchase: 
`http POST :8000/hexalot/buy X-User-Pubkey:"B9czvZ1x3sQ" X-User-Signature:fakesig parentLot=c38642d0cc44668a4a2a76c28d482f4e direction=0 newBits=1001110`

To test owned lots:
`http GET :8000/hexalot/owned X-User-Pubkey:"B9czvZ1x3sQ" X-User-Signature:fakesig`


Or using Curl

Purchase:
`curl -X POST localhost:8000/hexalot/buy -H "Content-Type: application/json"  -H X-User-Pubkey:"B9czvZ1x3sQ" -H X-User-Signature:curl -X POST localhost:8000/hexalot/buy -H "Content-Type: application/json"  -H X-User-Pubkey:"B9czvZ1x3sQ" -H X-User-Signature:fakesig -d '{"parentLot":"c38642d0cc44668a4a2a76c28d482f4e", "direction": 0, "newBits":"1001110"} -d '{"parentLot":"c38642d0cc44668a4a2a76c28d482f4e", "direction": 0, "newBits":"1001110"}`

Owned:
`curl -X GET localhost:8000/hexalot/owned -H X-User-Pubkey:"B9czvZ1x3sQ" -H X-User-Signature:fakesig`
