import { Invoice, LnRpc } from "@radar/lnrpc"
import { EventEmitter } from "events"

import { HexalotID } from "./types"

export class PaymentHandler {
    private invoiceSettledEvents: EventEmitter

    constructor(
        readonly lnRpc: LnRpc,
    ) {
        this.invoiceSettledEvents = new EventEmitter()
        this.setupSubscriptions()
    }

    public async createInvoice(
        islandName: string,
        lotID: HexalotID,
        value: string,
    ): Promise<{ payReq: string, paid: Promise<Invoice> }> {
        const memo = `galapagotchi.run/island/${islandName}/hexalot/${lotID}`
        const response = await this.lnRpc.addInvoice({
            memo,
            value,
        })
        const payReq = response.paymentRequest
        const paid = new Promise<Invoice>(resolve => {
            this.invoiceSettledEvents.once(payReq, resolve)
        })
        return {
            payReq,
            paid,
        }
    }

    private async setupSubscriptions(): Promise<void> {
        const subscriber = await this.lnRpc.subscribeInvoices({
            addIndex: "0",
            settleIndex: "0",
        })
        subscriber.on("data", (invoice: Invoice) => {
            if (invoice.settled && invoice.paymentRequest) {
                this.invoiceSettledEvents.emit(invoice.paymentRequest, invoice)
            }
        })
    }
}
