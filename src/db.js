import Dexie from 'dexie';

export const db = new Dexie('FinanceDB');

db.version(3).stores({
    profiles: '++id, name', // System Users (e.g. "Familia", "Negocio")
    owners: '++id, name, profileId', // People who spend (e.g. "Fernando", "Jesi")
    categories: '++id, name, type, color, profileId',
    subcategories: '++id, categoryId, name',
    rules: '++id, keyword, categoryId, subcategoryId, profileId',
    cardMappings: '++id, last4, owner, profileId', // Map card digits to Owner Name
    transactions: '++id, date, description, amount, currency, owner, account, category, type, sourceFile, profileId, isExtraordinary, accrualPeriod'
}).upgrade(tx => {
    // Migration logic: Set defaults for existing transactions
    return tx.table('transactions').toCollection().modify(t => {
        t.isExtraordinary = false;
        t.accrualPeriod = null;
    });
});

// Populate default data
db.on('populate', () => {
    db.profiles.add({ name: 'Default Profile' });

    db.owners.bulkAdd([
        { name: 'Fernando', profileId: 1 },
        { name: 'Jesi', profileId: 1 },
        { name: 'Elías', profileId: 1 }
    ]);

    db.categories.bulkAdd([
        { name: 'Comida', type: 'expense', color: '#FFBB28', profileId: 1 },
        { name: 'Transporte', type: 'expense', color: '#FF8042', profileId: 1 },
        { name: 'Hogar', type: 'expense', color: '#00C49F', profileId: 1 },
        { name: 'Servicios', type: 'expense', color: '#0088FE', profileId: 1 },
        { name: 'Entretenimiento', type: 'expense', color: '#8884d8', profileId: 1 },
        { name: 'Salud', type: 'expense', color: '#ff7300', profileId: 1 },
        { name: 'Ingresos', type: 'income', color: '#82ca9d', profileId: 1 },
        { name: 'Varios', type: 'expense', color: '#a4de6c', profileId: 1 }
    ]);
});
