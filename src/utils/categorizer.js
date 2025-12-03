// Categories
export const TRANSACTION_TYPES = {
    REAL_INCOME: 'Ingreso Real',
    REAL_EXPENSE: 'Gasto Real',
    INTERNAL_TRANSFER: 'Transferencia Interna',
    EXCLUDED: 'Excluido'
};

const EXPENSE_CATEGORIES = {
    'Supermercado': ['super', 'market', 'coto', 'carrefour', 'jumbo', 'disco', 'dia', 'chino', 'almacen'],
    'Comida y Bebida': ['restaurant', 'bar', 'cafe', 'coffee', 'burger', 'pizza', 'mc donald', 'starbucks', 'rappi', 'pedidosya'],
    'Transporte': ['uber', 'cabify', 'taxi', 'nafta', 'ypf', 'shell', 'axion', 'peaje', 'estacionamiento', 'sube'],
    'Servicios': ['luz', 'gas', 'agua', 'internet', 'cable', 'telefono', 'movistar', 'personal', 'claro', 'edenor', 'metrogas', 'aysa', 'fibertel', 'telecentro'],
    'Salud': ['farmacia', 'doctor', 'medico', 'osde', 'swiss', 'galeno', 'hospital', 'clinica'],
    'Entretenimiento': ['netflix', 'spotify', 'youtube', 'cine', 'teatro', 'entrada', 'juego', 'steam', 'playstation'],
    'Compras': ['amazon', 'mercadolibre', 'shopping', 'zara', 'adidas', 'nike', 'ropa'],
    'Hogar': ['easy', 'sodimac', 'ferreteria', 'pintureria', 'muebles'],
    'Varios': []
};

export function categorizeTransaction(description, amount, owner, account, rules = []) {
    const lowerDesc = description.toLowerCase();

    // --- 0. Dynamic Rules (Highest Priority) ---
    if (rules && rules.length > 0) {
        for (const rule of rules) {
            // Simple inclusion match for now. Could be regex in future.
            if (lowerDesc.includes(rule.keyword.toLowerCase())) {
                return {
                    type: rule.type || TRANSACTION_TYPES.REAL_EXPENSE, // Default to expense if not specified
                    subcategory: rule.categoryName // We expect the rule to have the resolved name
                };
            }
        }
    }

    let type = TRANSACTION_TYPES.REAL_EXPENSE; // Default
    let subcategory = 'Varios';

    // --- 1. EXCLUDED Rules ---
    if (owner === 'Elías') {
        return { type: TRANSACTION_TYPES.EXCLUDED, subcategory: 'Gastos Elías' };
    }

    // Additional cards for Elías (if owner is Fernando but description implies Elías)
    // This is hard to detect without specific names in description, but let's assume
    // if we see "ADICIONAL" and "ELIAS" it's him.
    if (lowerDesc.includes('adicional') && (lowerDesc.includes('elias') || lowerDesc.includes('elías'))) {
        return { type: TRANSACTION_TYPES.EXCLUDED, subcategory: 'Gastos Elías' };
    }

    // --- 2. INTERNAL TRANSFER Rules ---
    // Credit Card Payments
    if (lowerDesc.includes('pago tarjeta') || lowerDesc.includes('su pago') || lowerDesc.includes('pago de tarjeta')) {
        return { type: TRANSACTION_TYPES.INTERNAL_TRANSFER, subcategory: 'Pago Tarjeta' };
    }

    // Transfers between known parties
    if (lowerDesc.includes('transferencia') || lowerDesc.includes('trf')) {
        if (lowerDesc.includes('fernando') || lowerDesc.includes('jesi') || lowerDesc.includes('jesica') || lowerDesc.includes('propia')) {
            return { type: TRANSACTION_TYPES.INTERNAL_TRANSFER, subcategory: 'Transferencia Familiar' };
        }
    }

    // Investments (FIMA/Balanz)
    if (account === 'Balanz' || lowerDesc.includes('fima') || lowerDesc.includes('fondo comun')) {
        if (lowerDesc.includes('suscripcion') || lowerDesc.includes('rescate')) {
            return { type: TRANSACTION_TYPES.INTERNAL_TRANSFER, subcategory: 'Inversión' };
        }
        // Only interests/dividends are Real Income
        // This is tricky to distinguish from description alone without "Interes" or "Rendimiento"
        // Let's assume if it's NOT subscription/rescate, it might be income?
        // Or maybe we default to Transfer for safety unless explicitly "Renta"
        if (lowerDesc.includes('renta') || lowerDesc.includes('interes') || lowerDesc.includes('dividendo')) {
            return { type: TRANSACTION_TYPES.REAL_INCOME, subcategory: 'Rendimientos' };
        }
        // Default FIMA/Balanz to Transfer if unsure (better safe than inflating income/expense)
        return { type: TRANSACTION_TYPES.INTERNAL_TRANSFER, subcategory: 'Movimiento Inversión' };
    }

    // Cash Withdrawals
    if (lowerDesc.includes('extraccion') || lowerDesc.includes('cajero') || lowerDesc.includes('banelco') || lowerDesc.includes('link')) {
        return { type: TRANSACTION_TYPES.INTERNAL_TRANSFER, subcategory: 'Retiro Efectivo' };
    }

    // --- 3. REAL INCOME Rules ---
    // Positive amounts that are NOT transfers/refunds
    // Note: In some bank statements, credits are positive, debits negative.
    // In CC statements, expenses are positive.
    // We need to know the context. For now, let's rely on keywords.
    if (lowerDesc.includes('sueldo') || lowerDesc.includes('haberes') || lowerDesc.includes('honorarios')) {
        return { type: TRANSACTION_TYPES.REAL_INCOME, subcategory: 'Salario/Honorarios' };
    }

    // If amount is positive and it's a bank account (not CC), it might be income.
    // But we don't have the "isCreditCard" flag passed in easily yet.
    // Let's stick to expense categorization for everything else.

    // --- 4. REAL EXPENSE Categorization ---
    for (const [cat, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
        for (const keyword of keywords) {
            if (lowerDesc.includes(keyword)) {
                subcategory = cat;
                break;
            }
        }
        if (subcategory !== 'Varios') break;
    }

    return { type, subcategory };
}
