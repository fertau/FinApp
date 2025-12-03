import { v4 as uuidv4 } from 'uuid';

export function parseTransactions(text) {
    const lines = text.split('\n');
    const transactions = [];

    // Regex for dates (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    const dateRegex = /(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})/;
    // Regex for amounts (1,234.56 or 1.234,56 or 1234.56)
    // This is tricky. Let's assume standard format for now: 1,234.56 or 1234.56
    // We'll look for a number at the end of the line or near the date
    const amountRegex = /(-?[\d,]+\.\d{2})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const dateMatch = line.match(dateRegex);
        const amountMatch = line.match(amountRegex);

        if (dateMatch && amountMatch) {
            // High confidence: Line contains both date and amount
            const date = dateMatch[0];
            const rawAmount = amountMatch[0].replace(/,/g, ''); // Simple cleanup
            const amount = parseFloat(rawAmount);

            // Description is likely the rest of the line
            let description = line
                .replace(date, '')
                .replace(amountMatch[0], '')
                .trim();

            // Cleanup description
            description = description.replace(/\s+/g, ' ');

            if (!isNaN(amount)) {
                transactions.push({
                    id: uuidv4(),
                    date,
                    description: description || 'Unknown Transaction',
                    amount,
                    originalLine: line
                });
            }
        }
    }

    return transactions;
}
