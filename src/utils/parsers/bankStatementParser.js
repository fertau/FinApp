import { BaseParser, DATE_REGEX, AMOUNT_REGEX } from './baseParser';

export class BankStatementParser extends BaseParser {
    constructor(text, cardMappings = []) {
        super(text);
        this.cardMappings = cardMappings;
    }

    parse() {
        const transactions = [];

        for (const line of this.lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const dateMatch = trimmedLine.match(DATE_REGEX);
            const amountMatch = trimmedLine.match(AMOUNT_REGEX);

            if (dateMatch && amountMatch) {
                const date = dateMatch[0];
                const rawAmount = amountMatch[0];
                const amount = this.parseAmount(rawAmount);

                let description = trimmedLine
                    .replace(date, '')
                    .replace(rawAmount, '')
                    .trim();

                const transaction = this.createTransaction(date, description, amount, trimmedLine);

                // Check if description contains any known card digits
                for (const mapping of this.cardMappings) {
                    if (description.includes(mapping.last4)) {
                        transaction.owner = mapping.owner;
                        // Also maybe tag as transfer?
                        // If it says "PAGO TARJETA", it's a transfer/payment.
                        if (description.toUpperCase().includes('PAGO') || description.toUpperCase().includes('TARJETA')) {
                            transaction.type = 'INTERNAL_TRANSFER';
                        }
                        break;
                    }
                }

                transactions.push(transaction);
            }
        }
        return transactions;
    }
}
