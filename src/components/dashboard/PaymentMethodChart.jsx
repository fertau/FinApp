import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE'];

export default function PaymentMethodChart({ transactions, exchangeRate }) {
    const data = useMemo(() => {
        const totals = {};
        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;

            let amount = Math.abs(t.amount);
            if (t.currency === 'USD') amount *= exchangeRate;

            // Normalize payment method
            let method = t.paymentMethod || 'Otros';
            if (method.toLowerCase().includes('visa') || method.toLowerCase().includes('master')) method = 'Tarjeta';
            else if (method.toLowerCase().includes('debin') || method.toLowerCase().includes('transferencia')) method = 'Transferencia';
            else if (method.toLowerCase().includes('efectivo') || method.toLowerCase().includes('cash')) method = 'Efectivo';

            if (!totals[method]) totals[method] = 0;
            totals[method] += amount;
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, exchangeRate]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
        </ResponsiveContainer>
    );
}
