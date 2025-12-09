import { CreditCardParser } from './creditCardParser';
import { BankStatementParser } from './bankStatementParser';
import { AIParser } from './AIParser';
import { MoneyManagerParser } from './MoneyManagerParser';

export function getParserForFile(text, filename, cardMappings = [], options = {}) {
    // Options: { method: 'regex' | 'ai' | 'money-manager', apiKey: string, owner: string }

    // Explicit Money Manager selection
    if (options.method === 'money-manager') {
        return new MoneyManagerParser(text, options.owner || 'Esposa');
    }

    // AI Parser
    if (options.method === 'ai') {
        return new AIParser(text, options.apiKey, cardMappings);
    }

    const lowerText = text.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    // Auto-detect Money Manager CSV
    // Money Manager exports typically have headers like: Date,Category,Amount,Note
    const firstLine = text.split('\n')[0]?.toLowerCase() || '';
    if (firstLine.includes('date') && firstLine.includes('category') && firstLine.includes('amount')) {
        // Check if it's a simple CSV (not a bank statement)
        if (!lowerText.includes('balance') && !lowerText.includes('saldo')) {
            console.log('Auto-detected Money Manager format');
            return new MoneyManagerParser(text, options.owner || 'Esposa');
        }
    }

    // Heuristics to detect Credit Card vs Bank Statement

    // 1. Explicit filename keywords
    if (lowerFilename.includes('tarjeta') || lowerFilename.includes('visa') || lowerFilename.includes('mastercard') || lowerFilename.includes('amex')) {
        return new CreditCardParser(text, cardMappings);
    }

    // 2. Content keywords
    if (lowerText.includes('limite de compra') || lowerText.includes('pago minimo') || lowerText.includes('vencimiento actual')) {
        return new CreditCardParser(text, cardMappings);
    }

    // Default to Bank Statement
    return new BankStatementParser(text, cardMappings);
}
