import { Invoice, LnRpc } from "@radar/lnrpc"
import { EventEmitter } from "events"

import { HexalotID } from "./types"

export class PaymentHandler {
    private invoiceSettledEvents: EventEmitter

    constructor(readonly lnRpc: LnRpc) {
        this.invoiceSettledEvents = new EventEmitter()
        this.setupSubscriptions()
    }

    public async generatePayment(
        lotID: HexalotID,
        value: string,
    ): Promise<{ invoice: string, paid: Promise<void> }> {
        const memo = `galapagotchi.run/hexalot/${lotID}`
        const response = await this.lnRpc.addInvoice({
            memo,
            value,
        })
        const invoice = response.paymentRequest
        const paid = new Promise<void>(resolve => {
            this.invoiceSettledEvents.once(invoice, resolve)
        })
        return {
            invoice,
            paid,
        }
    }

    private async setupSubscriptions(): Promise<void> {
        const subscriber = await this.lnRpc.subscribeInvoices()
        subscriber.on("data", (invoice: Invoice) => {
            if (invoice.settled && invoice.paymentRequest)  {
                this.invoiceSettledEvents.emit(invoice.paymentRequest)
            }
        })
    }
}
