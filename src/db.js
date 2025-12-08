import Dexie from 'dexie';
import historicalRates from './data/historicalRates.json';

export const db = new Dexie('FinanceAnalyzerDB');

db.version(1).stores({
    profiles: '++id, name',
    owners: '++id, name, profileId',
    categories: '++id, name, profileId',
    subcategories: '++id, name, categoryId',
    transactions: '++id, date, description, amount, owner, category, profileId',
    rules: '++id, keyword, categoryId, subcategoryId, profileId',
    cardMappings: '++id, last4, owner, bank, profileId'
});

// Version 2: Add 'sourceFile' to transactions
db.version(2).stores({
    transactions: '++id, date, description, amount, owner, category, profileId, sourceFile'
});

// Version 3: Add 'isExtraordinary' and 'accrualPeriod'
db.version(3).stores({
    transactions: '++id, date, description, amount, owner, category, profileId, sourceFile, isExtraordinary, accrualPeriod'
}).upgrade(tx => {
    // Migration logic: Set defaults for existing transactions
    return tx.table('transactions').toCollection().modify(t => {
        t.isExtraordinary = false;
        t.accrualPeriod = null;
    });
});

// Version 4: Rename 'owners' to 'members' and remove hardcoded seeding
db.version(4).stores({
    members: '++id, name, profileId',
    owners: '++id, name, profileId', // Keep it for now to allow migration
    paymentMethods: '++id, name, type, currency, profileId' // New for Phase 2
}).upgrade(async tx => {
    const owners = await tx.table('owners').toArray();
    if (owners.length > 0) {
        await tx.table('members').bulkAdd(owners);
        // We can clear owners if we want, but let's leave it as backup for this session
    }
});

// Version 5: Add 'exchangeRates' store
// Version 5: Add 'exchangeRates' store with compound index
db.version(5).stores({
    exchangeRates: '++id, [date+currency], date, rate, currency' // date in YYYY-MM-DD format
});

// Version 6: Seed historical exchange rates
db.version(6).upgrade(async tx => {
    const count = await tx.table('exchangeRates').count();
    if (count === 0) {
        // Only seed if empty to avoid overwriting user data? 
        // Or maybe we should merge? 
        // Given the user wants to "ensure" a table, let's just bulkAdd. 
        // Dexie bulkAdd will fail if keys collide, but we have auto-increment ID.
        // However, we have a compound index [date+currency]. We don't want duplicates there?
        // The index isn't unique by default unless we specify it. 
        // Let's assume we just add them.
        console.log("Seeding historical rates...", historicalRates.length);
        await tx.table('exchangeRates').bulkAdd(historicalRates);
    } else {
        // If data exists, maybe we should check if we have history?
        // Let's just add them. If we want to avoid duplicates, we'd need to check.
        // For now, let's assume if count > 0, the user might have some data, but maybe not history.
        // But bulkAdd with 4000 items might be slow if we check each one.
        // Let's just try to add them. If we really care about duplicates, we should use bulkPut with a unique key.
        // But our key is ++id. 
        // Let's just add them. The user can clean up if needed, or we can rely on the service to pick the right one.
        // Actually, let's only seed if count < 100 (heuristic for "no history").
        if (count < 100) {
            await tx.table('exchangeRates').bulkAdd(historicalRates);
        }
    }
});

// Version 7: Add 'recurringExpenses' store
db.version(7).stores({
    recurringExpenses: '++id, userId, name, frequency, active, nextOccurrence'
});

// Version 8: Add 'categorizationRules' store
db.version(8).stores({
    categorizationRules: '++id, userId, enabled, createdAt'
});

// Populate default data only if fresh install
db.on('populate', async () => {
    // Default Profile
    const profileId = await db.profiles.add({ name: 'Personal' });

    // Default Categories
    await db.categories.bulkAdd([
        { name: 'Comida', type: 'expense', profileId, color: '#F59E0B' },
        { name: 'Transporte', type: 'expense', profileId, color: '#3B82F6' },
        { name: 'Servicios', type: 'expense', profileId, color: '#10B981' },
        { name: 'Salud', type: 'expense', profileId, color: '#EF4444' },
        { name: 'Entretenimiento', type: 'expense', profileId, color: '#8B5CF6' },
        { name: 'Compras', type: 'expense', profileId, color: '#EC4899' },
        { name: 'Educación', type: 'expense', profileId, color: '#6366F1' }
    ]);

    // No default members/owners seeded! User must create them or they are created on import.
});
