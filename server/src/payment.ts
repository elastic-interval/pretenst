import { Hexalot } from "./types"

export class PaymentHandler {
    public async generateInvoice(
        lot: Hexalot,
        amount: string,
    ): Promise<string> {
        // TODO: connect to lightning node
        return `FAKE_INVOICE:${lot}:${amount}`
    }

    public async waitForPayment(invoice: string): Promise<void> {
        // TODO: wait for invoice to be paid
    }
}
