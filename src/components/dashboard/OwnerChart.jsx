import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function OwnerChart({ transactions, exchangeRate }) {
    const data = useMemo(() => {
        const totals = {};
        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;

            let amount = Math.abs(t.amount);
            if (t.currency === 'USD') amount *= exchangeRate;

            const owner = t.owner || 'Desconocido';
            if (!totals[owner]) totals[owner] = 0;
            totals[owner] += amount;
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, exchangeRate]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-bg-tertiary)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} stroke="var(--color-text-secondary)" fontSize={12} />
                <Tooltip
                    formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                    contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-bg-tertiary)' }}
                />
                <Bar dataKey="value" fill="var(--color-accent-primary)" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
