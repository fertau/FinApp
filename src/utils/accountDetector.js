export function detectAccountAndOwner(text, filename, settings = {}) {
    const lowerText = text.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    // 1. Check User Settings first
    if (settings.accounts && settings.accounts.length > 0) {
        for (const account of settings.accounts) {
            const keywords = account.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            for (const keyword of keywords) {
                if (lowerFilename.includes(keyword) || lowerText.includes(keyword)) {
                    return { account: account.name, owner: account.owner };
                }
            }
        }
    }

    // 2. Fallback to Heuristics
    let account = 'Unknown Account';
    let owner = 'Fernando'; // Default owner

    if (lowerFilename.includes('galicia') || lowerText.includes('banco galicia')) {
        account = 'Galicia';
    } else if (lowerFilename.includes('santander') || lowerText.includes('santander')) {
        account = 'Santander';
    } else if (lowerFilename.includes('itau') || lowerText.includes('itau')) {
        account = 'Itaú Uruguay';
    } else if (lowerFilename.includes('balanz')) {
        account = 'Balanz';
    } else if (lowerFilename.includes('mercadopago') || lowerText.includes('mercadopago')) {
        account = 'MercadoPago';
    } else if (lowerFilename.includes('icbc') || lowerText.includes('icbc')) {
        account = 'ICBC';
    }

    return { account, owner };
}
