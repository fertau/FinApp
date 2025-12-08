import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currencyUtils';

export default function MonthlyFlowChart({ transactions, exchangeRate, currency }) {
    const data = useMemo(() => {
        const monthlyFlow = {};
        transactions.forEach(t => {
            // Transactions are already converted in Dashboard.jsx
            let amount = t.amount;

            const parts = t.date.split(/[-/]/);
            let month = parts[1];
            let year = parts[2];
            if (year && year.length === 2) year = '20' + year;

            if (month && year) {
                const key = `${year}-${month}`;
                if (!monthlyFlow[key]) monthlyFlow[key] = { name: key, income: 0, expense: 0 };

                if (t.type === 'income' || t.type === 'REAL_INCOME') {
                    monthlyFlow[key].income += amount;
                } else if (t.type === 'expense' || t.type === 'REAL_EXPENSE') {
                    monthlyFlow[key].expense += Math.abs(amount);
                }
            }
        });

        return Object.values(monthlyFlow).sort((a, b) => a.name.localeCompare(b.name));
    }, [transactions, exchangeRate]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-bg-tertiary)" />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                <Tooltip
                    formatter={(value) => formatCurrency(value, currency || 'ARS')}
                    contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-bg-tertiary)' }}
                />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="var(--color-error)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
