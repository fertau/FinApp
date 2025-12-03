import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300', '#a4de6c'];

export default function Analytics({ transactions, exchangeRate = 1000 }) {
    const data = useMemo(() => {
        const categoryTotals = {};
        const monthlyFlow = {};

        transactions.forEach(t => {
            // Convert to base currency (ARS)
            let amountInArs = t.amount;
            if (t.currency === 'USD') {
                amountInArs = t.amount * exchangeRate;
            }

            // Category Breakdown (Expenses only)
            if (t.type === 'REAL_EXPENSE') {
                const cat = t.category || 'Uncategorized';
                if (!categoryTotals[cat]) categoryTotals[cat] = 0;
                categoryTotals[cat] += Math.abs(amountInArs);
            }

            // Monthly Flow (Income vs Expense)
            // Extract Month-Year from date (assuming DD/MM/YYYY or similar)
            // Date format from parser is usually DD/MM/YYYY or DD/MM/YY
            // Let's normalize to YYYY-MM
            const parts = t.date.split(/[-/]/);
            let month = parts[1];
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            const key = `${year}-${month}`;

            if (!monthlyFlow[key]) monthlyFlow[key] = { name: key, income: 0, expense: 0 };

            if (t.type === 'REAL_INCOME') {
                monthlyFlow[key].income += amountInArs;
            } else if (t.type === 'REAL_EXPENSE') {
                monthlyFlow[key].expense += Math.abs(amountInArs);
            }
        });

        const pieData = Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const barData = Object.values(monthlyFlow).sort((a, b) => a.name.localeCompare(b.name));

        return { pieData, barData };
    }, [transactions, exchangeRate]);

    return (
        <div>
            <h2 style={{ marginBottom: '2rem' }}>Analytics</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Spending by Category */}
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: '1rem' }}>Spending by Category</h3>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cash Flow */}
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: '1rem' }}>Cash Flow</h3>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-bg-tertiary)" />
                                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-bg-tertiary)' }}
                                />
                                <Legend />
                                <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Expense" fill="var(--color-error)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
