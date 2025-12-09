/**
 * Money Manager CSV/Excel Parser
 * 
 * Parses exported files from Money Manager app
 * Supports both CSV and Excel formats
 */

export class MoneyManagerParser {
    constructor(text, owner = 'Esposa') {
        this.text = text;
        this.owner = owner; // Default owner for imported transactions
    }

    /**
     * Parse CSV content from Money Manager
     * Expected format (may vary):
     * Date,Category,Subcategory,Amount,Note,Account,Type
     */
    parse() {
        const lines = this.text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('El archivo está vacío');
        }

        // Parse header to detect column positions
        const header = lines[0].toLowerCase();
        const columns = this.parseHeader(header);

        const transactions = [];

        // Parse data rows (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const transaction = this.parseLine(line, columns);
                if (transaction) {
                    transactions.push(transaction);
                }
            } catch (error) {
                console.warn(`Error parsing line ${i + 1}:`, error.message);
            }
        }

        return transactions;
    }

    /**
     * Parse header and detect column positions
     */
    parseHeader(header) {
        const parts = this.splitCSVLine(header);
        const columns = {};

        parts.forEach((col, index) => {
            const normalized = col.toLowerCase().trim();

            // Date columns
            if (normalized.includes('date') || normalized.includes('fecha')) {
                columns.date = index;
            }
            // Category columns
            else if (normalized.includes('category') || normalized.includes('categoría') || normalized.includes('categoria')) {
                if (normalized.includes('sub')) {
                    columns.subcategory = index;
                } else {
                    columns.category = index;
                }
            }
            // Amount columns
            else if (normalized.includes('amount') || normalized.includes('monto') || normalized.includes('importe')) {
                columns.amount = index;
            }
            // Description/Note columns
            else if (normalized.includes('note') || normalized.includes('description') || normalized.includes('nota') || normalized.includes('descripción')) {
                columns.description = index;
            }
            // Account columns
            else if (normalized.includes('account') || normalized.includes('cuenta')) {
                columns.account = index;
            }
            // Type columns (Income/Expense)
            else if (normalized.includes('type') || normalized.includes('tipo')) {
                columns.type = index;
            }
        });

        return columns;
    }

    /**
     * Parse a single CSV line
     */
    parseLine(line, columns) {
        const parts = this.splitCSVLine(line);

        // Extract values based on detected columns
        const dateStr = parts[columns.date]?.trim();
        const category = parts[columns.category]?.trim() || 'Sin categoría';
        const subcategory = parts[columns.subcategory]?.trim();
        const amountStr = parts[columns.amount]?.trim();
        const description = parts[columns.description]?.trim() || category;
        const account = parts[columns.account]?.trim() || 'Money Manager';
        const typeStr = parts[columns.type]?.trim()?.toLowerCase();

        // Validate required fields
        if (!dateStr || !amountStr) {
            return null;
        }

        // Parse date (try multiple formats)
        const date = this.parseDate(dateStr);
        if (!date) {
            console.warn(`Invalid date: ${dateStr}`);
            return null;
        }

        // Parse amount
        const amount = this.parseAmount(amountStr);
        if (isNaN(amount) || amount === 0) {
            console.warn(`Invalid amount: ${amountStr}`);
            return null;
        }

        // Determine transaction type
        let type = 'expense';
        if (typeStr) {
            if (typeStr.includes('income') || typeStr.includes('ingreso')) {
                type = 'income';
            } else if (typeStr.includes('transfer') || typeStr.includes('transferencia')) {
                type = 'transfer';
            }
        } else {
            // If no type column, assume expense if amount is positive
            type = amount > 0 ? 'expense' : 'income';
        }

        return {
            date,
            description,
            amount: Math.abs(amount),
            category: subcategory || category,
            type,
            owner: this.owner,
            account,
            currency: 'ARS', // Default, can be configured
            sourceFile: 'Money Manager Import',
            isExtraordinary: false
        };
    }

    /**
     * Split CSV line handling quoted fields
     */
    splitCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result.map(s => s.replace(/^"|"$/g, '').trim());
    }

    /**
     * Parse date from various formats
     */
    parseDate(dateStr) {
        // Try formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY
        const formats = [
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,  // DD/MM/YYYY or MM/DD/YYYY
            /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,  // YYYY-MM-DD
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (match[1].length === 4) {
                    // YYYY-MM-DD
                    const [, year, month, day] = match;
                    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
                } else {
                    // DD/MM/YYYY or MM/DD/YYYY
                    // Assume DD/MM/YYYY for Latin America
                    const [, day, month, year] = match;
                    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
                }
            }
        }

        return null;
    }

    /**
     * Parse amount from string
     */
    parseAmount(amountStr) {
        // Remove currency symbols and spaces
        let cleaned = amountStr.replace(/[^\d,.\-]/g, '');

        // Handle different decimal separators
        // If there are both comma and dot, the last one is decimal
        if (cleaned.includes(',') && cleaned.includes('.')) {
            const lastComma = cleaned.lastIndexOf(',');
            const lastDot = cleaned.lastIndexOf('.');

            if (lastComma > lastDot) {
                // Comma is decimal separator (European format)
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Dot is decimal separator (US format)
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (cleaned.includes(',')) {
            // Only comma - could be thousands or decimal
            // If there are 3 digits after comma, it's thousands
            const parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length === 3) {
                cleaned = cleaned.replace(',', '');
            } else {
                cleaned = cleaned.replace(',', '.');
            }
        }

        return parseFloat(cleaned);
    }
}
