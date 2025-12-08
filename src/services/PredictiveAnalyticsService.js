import { startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';

export const PredictiveAnalyticsService = {
    /**
     * Project total expenses for the end of the current month
     * @param {Array} transactions - Current month transactions
     * @param {Date} currentDate - Current date
     * @returns {Object} - Projection data
     */
    projectMonthEndExpenses(transactions, currentDate = new Date()) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const totalDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
        const daysPassed = differenceInDays(currentDate, monthStart) + 1;
        const daysRemaining = totalDaysInMonth - daysPassed;

        // Filter transactions for current month (expenses only)
        const currentMonthExpenses = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= monthStart &&
                txDate <= currentDate &&
                t.type !== 'EXCLUDED' &&
                t.type !== 'income' &&
                t.amount < 0; // Expenses are negative
        });

        // Calculate total spent so far
        const totalSpent = Math.abs(
            currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0)
        );

        // Calculate daily average
        const dailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0;

        // Project end of month total
        const projectedTotal = totalSpent + (dailyAverage * daysRemaining);

        // Calculate projection confidence based on how much of the month has passed
        const confidence = Math.min(daysPassed / totalDaysInMonth, 1);

        return {
            totalSpent,
            projectedTotal,
            dailyAverage,
            daysPassed,
            daysRemaining,
            totalDaysInMonth,
            confidence,
            monthStart: format(monthStart, 'yyyy-MM-dd'),
            monthEnd: format(monthEnd, 'yyyy-MM-dd')
        };
    },

    /**
     * Detect spending anomalies by comparing current month to historical average
     * @param {Array} currentTransactions - Current month transactions
     * @param {Array} historicalTransactions - Past months transactions (3-6 months recommended)
     * @param {number} threshold - Percentage threshold for anomaly (default 30%)
     * @returns {Array} - Array of anomalies by category
     */
    detectAnomalies(currentTransactions, historicalTransactions, threshold = 0.30) {
        // Group current month expenses by category
        const currentByCategory = this._groupByCategory(currentTransactions, true);

        // Group historical expenses by category
        const historicalByCategory = this._groupByCategory(historicalTransactions, false);

        // Calculate historical averages per category
        const historicalAverages = {};
        Object.keys(historicalByCategory).forEach(category => {
            const transactions = historicalByCategory[category];
            const monthsData = this._groupByMonth(transactions);
            const monthlyTotals = Object.values(monthsData).map(txs =>
                Math.abs(txs.reduce((sum, t) => sum + t.amount, 0))
            );

            historicalAverages[category] = monthlyTotals.length > 0
                ? monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length
                : 0;
        });

        // Detect anomalies
        const anomalies = [];
        Object.keys(currentByCategory).forEach(category => {
            const currentTotal = Math.abs(
                currentByCategory[category].reduce((sum, t) => sum + t.amount, 0)
            );
            const historicalAvg = historicalAverages[category] || 0;

            if (historicalAvg === 0 && currentTotal > 0) {
                // New category spending
                anomalies.push({
                    category,
                    type: 'new',
                    currentTotal,
                    historicalAverage: 0,
                    percentageChange: 100,
                    difference: currentTotal
                });
            } else if (historicalAvg > 0) {
                const percentageChange = (currentTotal - historicalAvg) / historicalAvg;

                if (Math.abs(percentageChange) >= threshold) {
                    anomalies.push({
                        category,
                        type: percentageChange > 0 ? 'increase' : 'decrease',
                        currentTotal,
                        historicalAverage: historicalAvg,
                        percentageChange,
                        difference: currentTotal - historicalAvg
                    });
                }
            }
        });

        // Sort by absolute percentage change (highest first)
        return anomalies.sort((a, b) =>
            Math.abs(b.percentageChange) - Math.abs(a.percentageChange)
        );
    },

    /**
     * Generate savings suggestions based on spending patterns
     * @param {Array} transactions - Recent transactions
     * @param {Array} categories - Available categories
     * @param {number} targetSavingsPercentage - Target savings as percentage (default 20%)
     * @returns {Array} - Array of savings suggestions
     */
    generateSavingsSuggestions(transactions, categories = [], targetSavingsPercentage = 0.20) {
        // Group by category
        const byCategory = this._groupByCategory(transactions, true);

        // Calculate total spending
        const totalSpending = Math.abs(
            transactions
                .filter(t => t.type !== 'EXCLUDED' && t.type !== 'income' && t.amount < 0)
                .reduce((sum, t) => sum + t.amount, 0)
        );

        const suggestions = [];

        // Analyze each category
        Object.keys(byCategory).forEach(category => {
            const categoryTransactions = byCategory[category];
            const categoryTotal = Math.abs(
                categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
            );
            const categoryPercentage = totalSpending > 0 ? categoryTotal / totalSpending : 0;

            // Identify high-spending categories (>15% of total)
            if (categoryPercentage > 0.15) {
                const potentialSavings = categoryTotal * targetSavingsPercentage;
                const newMonthlyTotal = categoryTotal - potentialSavings;

                suggestions.push({
                    category,
                    type: 'reduce_high_spending',
                    currentSpending: categoryTotal,
                    percentageOfTotal: categoryPercentage,
                    targetReduction: targetSavingsPercentage,
                    potentialSavings,
                    newMonthlyTotal,
                    priority: 'high',
                    actionable: true
                });
            }

            // Identify frequent small transactions (potential subscription/recurring costs)
            const frequentSmall = categoryTransactions.filter(t =>
                Math.abs(t.amount) < 50 && Math.abs(t.amount) > 5
            );

            if (frequentSmall.length >= 5) {
                const frequentTotal = Math.abs(
                    frequentSmall.reduce((sum, t) => sum + t.amount, 0)
                );

                suggestions.push({
                    category,
                    type: 'frequent_small_expenses',
                    currentSpending: frequentTotal,
                    transactionCount: frequentSmall.length,
                    averageAmount: frequentTotal / frequentSmall.length,
                    potentialSavings: frequentTotal * 0.30, // Assume 30% can be eliminated
                    priority: 'medium',
                    actionable: true
                });
            }
        });

        // Sort by potential savings (highest first)
        return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
    },

    /**
     * Helper: Group transactions by category
     * @private
     */
    _groupByCategory(transactions, currentMonthOnly = false) {
        const grouped = {};

        const filtered = currentMonthOnly
            ? transactions.filter(t => {
                const txDate = new Date(t.date);
                const now = new Date();
                return txDate.getMonth() === now.getMonth() &&
                    txDate.getFullYear() === now.getFullYear() &&
                    t.type !== 'EXCLUDED' &&
                    t.type !== 'income' &&
                    t.amount < 0;
            })
            : transactions.filter(t =>
                t.type !== 'EXCLUDED' &&
                t.type !== 'income' &&
                t.amount < 0
            );

        filtered.forEach(t => {
            const category = t.category || 'Sin Categoría';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(t);
        });

        return grouped;
    },

    /**
     * Helper: Group transactions by month
     * @private
     */
    _groupByMonth(transactions) {
        const grouped = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(t);
        });

        return grouped;
    }
};
