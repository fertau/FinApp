import { BaseParser, DATE_REGEX, AMOUNT_REGEX } from './baseParser';



export class CreditCardParser extends BaseParser {
    constructor(text, cardMappings = []) {
        super(text);
        this.cardMappings = cardMappings;
    }

    parse() {
        const transactions = [];
        const metadata = this.detectMetadata();

        let currentOwner = null;
        let buffer = []; // Transactions waiting for an owner (if using footer logic)

        // Regex patterns
        // Relaxed regex to catch "TARJETA 1234 Total Consumos de NAME" with potential extra spaces or chars
        // We make "TARJETA" and digits optional to catch just "Total Consumos de NAME"
        const GALICIA_FOOTER_REGEX = /(?:TARJETA\s+(?:XXXX\s+)?(\d+)\s+)?Total\s+Consumos\s+de\s+([A-Z\s\.]+)/i;
        const GENERIC_HEADER_REGEX = /TARJETA\s+(?:XXXX\s+)?(\d+)\s+(.+)/i;
        const PAYMENT_KEYWORDS = ['SU PAGO', 'PAGO EN PESOS', 'PAGO EN DOLARES', 'PAGO DE RESUMEN', 'SALDO ANTERIOR'];
        const INSTALLMENT_REGEX = /(\d{1,2})\/(\d{1,2})/; // Matches 1/12, 05/12, etc.

        console.log("Starting CreditCardParser...");

        // Detect Statement Date (Vencimiento or Cierre)
        let statementDate = null;
        const DATE_HEADER_REGEX = /(?:Vencimiento|Cierre|Fecha de Cierre|Vto\.|Vto)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{2,4})/i;

        for (let line of this.lines) {
            const match = line.match(DATE_HEADER_REGEX);
            if (match) {
                statementDate = match[1];
                console.log("Detected Statement Date:", statementDate);
                break; // Assume first one is correct
            }
        }

        for (let line of this.lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // ... (rest of loop)

            // Debug log for potential headers
            if (trimmedLine.toUpperCase().includes('CONSUMOS DE')) {
                console.log("Found potential owner line:", trimmedLine);
            }

            // 1. Check for Owner/Card Markers (Headers or Footers)

            // Galicia Style Footer
            const galiciaMatch = trimmedLine.match(GALICIA_FOOTER_REGEX);
            if (galiciaMatch) {
                const lastDigits = galiciaMatch[1] || '0000'; // Might be undefined if we matched the relaxed version
                const ownerName = galiciaMatch[2].trim();

                console.log(`MATCHED OWNER: ${ownerName} (Card: ${lastDigits})`);

                const resolvedOwner = this.resolveOwner(lastDigits, ownerName);

                buffer.forEach(t => {
                    if (!t.owner) t.owner = resolvedOwner;
                    // Also update payment method if we found the card details
                    if (!t.paymentMethod && lastDigits !== '0000') t.paymentMethod = `Tarjeta ${lastDigits}`;
                });
                transactions.push(...buffer);
                buffer = [];
                // CRITICAL FIX: Reset currentOwner to null. 
                // This ensures that subsequent transactions (for the NEXT card) are buffered 
                // instead of being immediately assigned to this owner.
                // They will be assigned when we hit the NEXT footer.
                currentOwner = null;
                continue; // Skip parsing this line as transaction
            }

            // Check for explicit card number in line (Header style or inline)
            for (const mapping of this.cardMappings) {
                if (trimmedLine.includes(mapping.last4)) {
                    currentOwner = mapping.owner;
                    // If we have a buffer and we hit a NEW header, the buffer probably belonged to the PREVIOUS owner (or unknown).
                    // But if we are switching context, we should flush the buffer.
                    // In "Header" style, buffer shouldn't really exist unless we missed the header.
                    // Let's just flush buffer as "Unknown" or keep it?
                    // If we switch owner, assume previous buffer is done.
                    if (buffer.length > 0) {
                        transactions.push(...buffer);
                        buffer = [];
                    }
                }
            }

            // 2. Parse Transaction
            // Loop to find all transactions in the line
            let lineCopy = trimmedLine;
            let foundTransaction = false;

            while (true) {
                const dateMatch = lineCopy.match(DATE_REGEX);
                if (!dateMatch) {
                    // Debug: Log why we stopped finding transactions in this line
                    // console.log("No date found in remainder:", lineCopy);
                    break;
                }

                const dateIndex = dateMatch.index;
                const textAfterDate = lineCopy.slice(dateIndex + dateMatch[0].length);
                const amounts = [...textAfterDate.matchAll(new RegExp(AMOUNT_REGEX, 'g'))];

                if (amounts.length === 0) {
                    console.log("Date found but NO amount:", dateMatch[0], textAfterDate);
                    break;
                }

                const lastAmountMatch = amounts[amounts.length - 1];
                const rawAmount = lastAmountMatch[0];
                const amountIndexInRest = lastAmountMatch.index;

                let date = dateMatch[0];
                let description = textAfterDate.slice(0, amountIndexInRest).trim();

                // Currency Detection
                let currency = 'ARS';
                if (description.includes('USD') || description.includes('U$S') || metadata.currency === 'USD') {
                    currency = 'USD';
                }

                // Installment Detection
                let installment = null;
                let totalInstallments = null;
                const installmentMatch = description.match(INSTALLMENT_REGEX);
                if (installmentMatch) {
                    installment = parseInt(installmentMatch[1]);
                    totalInstallments = parseInt(installmentMatch[2]);
                }

                // Adjust Date for Installments
                if (installment && statementDate) {
                    try {
                        // Parse statement date (DD/MM/YYYY or similar)
                        // Normalize separators
                        const normalizedStatementDate = statementDate.replace(/-/g, '/');
                        const [sDay, sMonth, sYear] = normalizedStatementDate.split('/');

                        // Parse transaction date
                        const normalizedDate = date.replace(/-/g, '/');
                        const [tDay] = normalizedDate.split('/');

                        // Use original day + statement month/year
                        // Ensure year is 4 digits
                        let finalYear = sYear;
                        if (sYear.length === 2) finalYear = '20' + sYear;

                        date = `${tDay}/${sMonth}/${finalYear}`;
                    } catch (e) {
                        console.warn("Error adjusting installment date:", e);
                    }
                }

                // Clean description
                description = this.cleanDescription(description);

                // Check if it's a Payment or Balance
                let type = 'expense';
                if (PAYMENT_KEYWORDS.some(k => description.toUpperCase().includes(k))) {
                    type = 'payment';
                }

                // Parse amount
                let amount = this.parseAmount(rawAmount);
                if (type === 'expense') {
                    amount = -Math.abs(amount); // Expenses are negative
                } else {
                    amount = Math.abs(amount); // Payments are positive
                }

                const transaction = this.createTransaction(date, description, amount, trimmedLine, currency);

                if (type === 'payment') {
                    transaction.type = 'EXCLUDED';
                    // We can store originalType if we want to allow restoring it as payment later
                    transaction.originalType = 'payment';
                } else {
                    transaction.type = type;
                }

                // Add Metadata
                if (metadata.bank) transaction.bank = metadata.bank;
                if (metadata.brand) transaction.cardBrand = metadata.brand;
                if (installment) {
                    transaction.installment = installment;
                    transaction.totalInstallments = totalInstallments;
                    transaction.isInstallment = true;
                }

                // Payment Method Construction
                // If we have metadata, use it. e.g. "Visa Galicia"
                let paymentMethod = 'Tarjeta Crédito';
                if (metadata.brand) paymentMethod = metadata.brand;
                if (metadata.bank) paymentMethod += ` ${metadata.bank}`;
                transaction.paymentMethod = paymentMethod;

                // Owner Assignment
                if (currentOwner) {
                    transaction.owner = currentOwner;
                    transactions.push(transaction); // Known owner, push directly
                } else {
                    buffer.push(transaction); // Unknown owner, buffer it (waiting for footer)
                }

                foundTransaction = true;

                // Advance
                const consumedLength = dateIndex + dateMatch[0].length + amountIndexInRest + rawAmount.length;
                lineCopy = lineCopy.slice(consumedLength);
            }

            // If line had no transactions but we buffered stuff, maybe check if it was a header we missed?
            // No, we handled markers at the top.
        }

        // Flush remaining buffer
        if (buffer.length > 0) {
            transactions.push(...buffer);
        }

        return transactions;
    }

    detectMetadata() {
        const text = this.text.toUpperCase();
        const metadata = { bank: null, brand: null, currency: 'ARS' };

        // Bank
        if (text.includes('GALICIA')) metadata.bank = 'Galicia';
        else if (text.includes('SANTANDER')) metadata.bank = 'Santander';
        else if (text.includes('BBVA') || text.includes('FRANCES')) metadata.bank = 'BBVA';
        else if (text.includes('MACRO')) metadata.bank = 'Macro';
        else if (text.includes('HSBC')) metadata.bank = 'HSBC';
        else if (text.includes('ICBC')) metadata.bank = 'ICBC';
        else if (text.includes('NACION')) metadata.bank = 'Nacion';

        // Brand
        if (text.includes('VISA')) metadata.brand = 'Visa';
        else if (text.includes('MASTERCARD') || text.includes('MASTER')) metadata.brand = 'Mastercard';
        else if (text.includes('AMEX') || text.includes('AMERICAN EXPRESS')) metadata.brand = 'Amex';

        return metadata;
    }

    resolveOwner(lastDigits, nameFromPdf) {
        // 1. Try to match with cardMappings
        const mapping = this.cardMappings.find(m => m.last4.endsWith(lastDigits) || lastDigits.endsWith(m.last4));
        if (mapping) return mapping.owner;

        // 2. Try to match nameFromPdf with known owners (fuzzy match?)
        // For now, just return the name found in PDF properly capitalized
        return this.capitalize(nameFromPdf);
    }

    capitalize(str) {
        return str.toLowerCase().replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
    }
}
