import { CreditCardParser } from './creditCardParser';
import { BankStatementParser } from './bankStatementParser';
import { AIParser } from './AIParser';

export function getParserForFile(text, filename, cardMappings = [], options = {}) {
    // Options: { method: 'regex' | 'ai', apiKey: string }

    if (options.method === 'ai') {
        return new AIParser(text, options.apiKey, cardMappings);
    }

    const lowerText = text.toLowerCase();
    const lowerFilename = filename.toLowerCase();

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
