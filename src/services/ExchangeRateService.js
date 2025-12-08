import { db } from '../db';

export const ExchangeRateService = {
    // Get rate for a specific date (or closest previous date)
    async getRate(dateStr, currency = 'USD') {
        if (!dateStr) return 1;

        // 1. Robust Date Parsing
        let formattedDate = dateStr;
        // Handle DD/MM/YYYY or DD-MM-YYYY
        if (typeof dateStr === 'string') {
            const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
            if (ddmmyyyy) {
                const [_, d, m, y] = ddmmyyyy;
                formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                // Already YYYY-MM-DD (or ISO start), take first 10 chars
                formattedDate = dateStr.substring(0, 10);
            }
        }

        // 2. Query Logic
        // Try to find exact match or closest previous date
        const rateEntry = await db.exchangeRates
            .where('date')
            .belowOrEqual(formattedDate)
            .reverse()
            .filter(r => r.currency === currency)
            .first();

        if (rateEntry) {
            // console.log(`Found rate for ${formattedDate}: ${rateEntry.rate}`);
            return rateEntry.rate;
        }

        // 3. Fallback: If no rate found (e.g. date is before our history), 
        // DO NOT return 1. Return the OLDEST available rate (better than 1)
        // OR return the LATEST available rate (if date is in future/unknown).

        // Let's try to get the LATEST rate available in the DB.
        // This is safer for "current" context.
        const latestRate = await db.exchangeRates
            .where('currency').equals(currency)
            .reverse()
            .sortBy('date')
            .then(arr => arr[0]);

        if (latestRate) {
            console.warn(`No rate found for ${formattedDate}. Using latest available: ${latestRate.rate} (${latestRate.date})`);
            return latestRate.rate;
        }

        console.warn(`No exchange rate found for ${formattedDate} (${currency}) and no history available. Returning 1.`);
        return 1;
    },

    // Add or update a rate
    async setRate(date, rate, currency = 'USD') {
        const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

        const existing = await db.exchangeRates
            .where({ date: dateStr, currency })
            .first();

        if (existing) {
            await db.exchangeRates.update(existing.id, { rate });
        } else {
            await db.exchangeRates.add({ date: dateStr, rate, currency });
        }
    },

    // Bulk add rates (useful for seeding)
    async bulkAddRates(rates) {
        // rates = [{ date: '2023-01-01', rate: 350, currency: 'USD' }, ...]
        await db.exchangeRates.bulkPut(rates);
    },

    // Get all rates sorted by date
    async getAllRates(currency = 'USD') {
        return await db.exchangeRates
            .where('currency').equals(currency)
            .sortBy('date');
    }
};
