import Dexie from 'dexie';

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
