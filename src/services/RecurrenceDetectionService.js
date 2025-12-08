import { db } from '../db';

/**
 * Service for detecting and managing recurring expenses
 */
export class RecurrenceDetectionService {
    /**
     * Detects recurring transactions based on patterns
     * @param {Array} transactions - All transactions to analyze
     * @returns {Array} Array of recurring expense groups
     */
    static async detectRecurringTransactions(transactions) {
        // Filter only expenses
        const expenses = transactions.filter(t =>
            t.type === 'expense' || t.type === 'REAL_EXPENSE'
        );

        // Group by similar description and amount
        const groups = {};

        expenses.forEach(transaction => {
            const normalizedDesc = this.normalizeDescription(transaction.description);
            const amountKey = Math.round(transaction.amount / 100) * 100; // Group by ~100 units
            const key = `${normalizedDesc}_${amountKey}_${transaction.currency}`;

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(transaction);
        });

        // Analyze each group for recurrence patterns
        const recurringGroups = [];

        for (const [key, groupTransactions] of Object.entries(groups)) {
            if (groupTransactions.length < 2) continue; // Need at least 2 occurrences

            // Sort by date
            groupTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate intervals between transactions
            const intervals = [];
            for (let i = 1; i < groupTransactions.length; i++) {
                const daysDiff = this.daysBetween(
                    groupTransactions[i - 1].date,
                    groupTransactions[i].date
                );
                intervals.push(daysDiff);
            }

            // Check if intervals are consistent (monthly ~30 days, weekly ~7 days)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // If standard deviation is low, it's likely recurring
            const isRecurring = stdDev < 5 && (
                (avgInterval >= 25 && avgInterval <= 35) || // Monthly
                (avgInterval >= 5 && avgInterval <= 9) ||   // Weekly
                (avgInterval >= 12 && avgInterval <= 16)    // Biweekly
            );

            if (isRecurring) {
                const frequency = this.determineFrequency(avgInterval);
                const lastTransaction = groupTransactions[groupTransactions.length - 1];

                recurringGroups.push({
                    name: this.extractName(lastTransaction.description),
                    amount: Math.abs(lastTransaction.amount),
                    currency: lastTransaction.currency,
                    frequency,
                    category: lastTransaction.category,
                    subcategory: lastTransaction.subcategory,
                    lastOccurrence: lastTransaction.date,
                    nextOccurrence: this.calculateNextOccurrence(lastTransaction.date, frequency),
                    confidence: this.calculateConfidence(intervals, avgInterval),
                    linkedTransactionIds: groupTransactions.map(t => t.id),
                    active: true
                });
            }
        }

        return recurringGroups;
    }

    /**
     * Normalize description for comparison
     */
    static normalizeDescription(description) {
        return description
            .toLowerCase()
            .replace(/\d+/g, '') // Remove numbers
            .replace(/[^\w\s]/g, '') // Remove special chars
            .trim()
            .substring(0, 20); // First 20 chars
    }

    /**
     * Extract a clean name from description
     */
    static extractName(description) {
        // Remove common prefixes/suffixes
        let name = description
            .replace(/^(pago|compra|suscripcion|cuota)\s+/i, '')
            .replace(/\s+(mensual|anual|semanal)$/i, '')
            .trim();

        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * Calculate days between two dates
     */
    static daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Determine frequency based on average interval
     */
    static determineFrequency(avgInterval) {
        if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';
        if (avgInterval >= 5 && avgInterval <= 9) return 'weekly';
        if (avgInterval >= 12 && avgInterval <= 16) return 'biweekly';
        if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly';
        if (avgInterval >= 350 && avgInterval <= 370) return 'yearly';
        return 'custom';
    }

    /**
     * Calculate next occurrence date
     */
    static calculateNextOccurrence(lastDate, frequency) {
        const date = new Date(lastDate);

        switch (frequency) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'biweekly':
                date.setDate(date.getDate() + 14);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1); // Default to monthly
        }

        return date.toISOString().split('T')[0];
    }

    /**
     * Calculate confidence score (0-100)
     */
    static calculateConfidence(intervals, avgInterval) {
        if (intervals.length === 0) return 0;

        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // Lower std dev = higher confidence
        const confidence = Math.max(0, Math.min(100, 100 - (stdDev * 10)));
        return Math.round(confidence);
    }

    /**
     * Predict next occurrence for a recurring expense
     */
    static predictNextOccurrence(recurringExpense) {
        return this.calculateNextOccurrence(
            recurringExpense.lastOccurrence,
            recurringExpense.frequency
        );
    }

    /**
     * Check if a recurring expense is due soon (within days)
     */
    static isDueSoon(recurringExpense, daysAhead = 3) {
        const nextDate = new Date(recurringExpense.nextOccurrence);
        const today = new Date();
        const daysUntil = this.daysBetween(today, nextDate);

        return daysUntil <= daysAhead && daysUntil >= 0;
    }

    /**
     * Get all recurring expenses from database
     */
    static async getAllRecurringExpenses(userId) {
        const tx = db.transaction('recurringExpenses', 'readonly');
        const store = tx.objectStore('recurringExpenses');
        const index = store.index('userId');
        const expenses = await index.getAll(userId);
        await tx.done;
        return expenses;
    }

    /**
     * Save recurring expense to database
     */
    static async saveRecurringExpense(userId, recurringExpense) {
        const tx = db.transaction('recurringExpenses', 'readwrite');
        const store = tx.objectStore('recurringExpenses');

        const expense = {
            ...recurringExpense,
            userId,
            id: recurringExpense.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: recurringExpense.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await store.put(expense);
        await tx.done;
        return expense;
    }

    /**
     * Update recurring expense
     */
    static async updateRecurringExpense(id, updates) {
        const tx = db.transaction('recurringExpenses', 'readwrite');
        const store = tx.objectStore('recurringExpenses');

        const existing = await store.get(id);
        if (!existing) {
            throw new Error('Recurring expense not found');
        }

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await store.put(updated);
        await tx.done;
        return updated;
    }

    /**
     * Delete recurring expense
     */
    static async deleteRecurringExpense(id) {
        const tx = db.transaction('recurringExpenses', 'readwrite');
        await tx.objectStore('recurringExpenses').delete(id);
        await tx.done;
    }

    /**
     * Mark transaction as recurring manually
     */
    static async markAsRecurring(userId, transaction, frequency = 'monthly') {
        const recurringExpense = {
            name: this.extractName(transaction.description),
            amount: Math.abs(transaction.amount),
            currency: transaction.currency,
            frequency,
            category: transaction.category,
            subcategory: transaction.subcategory,
            lastOccurrence: transaction.date,
            nextOccurrence: this.calculateNextOccurrence(transaction.date, frequency),
            confidence: 100, // Manual marking = 100% confidence
            linkedTransactionIds: [transaction.id],
            active: true
        };

        return this.saveRecurringExpense(userId, recurringExpense);
    }

    /**
     * Get upcoming renewals (within next N days)
     */
    static async getUpcomingRenewals(userId, daysAhead = 7) {
        const allExpenses = await this.getAllRecurringExpenses(userId);
        const today = new Date();

        return allExpenses
            .filter(exp => exp.active)
            .map(exp => ({
                ...exp,
                daysUntil: this.daysBetween(today, new Date(exp.nextOccurrence))
            }))
            .filter(exp => exp.daysUntil >= 0 && exp.daysUntil <= daysAhead)
            .sort((a, b) => a.daysUntil - b.daysUntil);
    }
}
