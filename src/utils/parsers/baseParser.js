import { v4 as uuidv4 } from 'uuid';

// Supports DD/MM/YYYY, DD/MM/YY, and DD-MMM-YY (Spanish)
export const DATE_REGEX = /(\d{2}[/-]\d{2}[/-](\d{4}|\d{2}))|(\d{2}-(?:Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)-\d{2})/i;

// Supports 1,234.56 (US) and 1.234,56 (LatAm)
// We look for a number that ends with a decimal separator and 2 digits
export const AMOUNT_REGEX = /(-?[\d.,]+[.,]\d{2})/;

export class BaseParser {
    constructor(text) {
        this.text = text;
        this.lines = text.split('\n');
    }

    parse() {
        throw new Error('Method parse() must be implemented');
    }

    createTransaction(date, description, amount, originalLine, currency = 'ARS') {
        return {
            id: uuidv4(),
            date: this.normalizeDate(date),
            description: this.cleanDescription(description),
            amount: amount, // Amount is already parsed by parseAmount
            currency,
            originalLine
        };
    }

    cleanDescription(desc) {
        return desc.replace(/\s+/g, ' ').trim();
    }

    normalizeDate(rawDate) {
        // Handle DD-MMM-YY (Spanish)
        const spanishMonths = {
            'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
            'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
        };

        if (/[a-zA-Z]/.test(rawDate)) {
            const parts = rawDate.split('-');
            if (parts.length === 3) {
                const day = parts[0];
                const monthStr = parts[1].toUpperCase();
                const year = parts[2];
                const month = spanishMonths[monthStr];
                if (month) {
                    // Assume 20xx for 2-digit year
                    const fullYear = year.length === 2 ? `20${year}` : year;
                    return `${day}/${month}/${fullYear}`;
                }
            }
        }
        return rawDate;
    }

    parseAmount(rawAmount) {
        // Detect format
        if (rawAmount.includes(',') && rawAmount.includes('.')) {
            // Mixed separators.
            // If last separator is comma: 1.234,56 -> LatAm
            if (rawAmount.lastIndexOf(',') > rawAmount.lastIndexOf('.')) {
                return parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
            }
            // Else: 1,234.56 -> US
            return parseFloat(rawAmount.replace(/,/g, ''));
        } else if (rawAmount.includes(',')) {
            // Only comma. Could be 1,234 (US int) or 12,34 (LatAm decimal)
            // If it matches ,XX at the end, treat as decimal separator
            if (/,\d{2}$/.test(rawAmount)) {
                return parseFloat(rawAmount.replace(',', '.'));
            }
            return parseFloat(rawAmount.replace(/,/g, ''));
        }
        // Only dot or no separator
        return parseFloat(rawAmount);
    }
}
