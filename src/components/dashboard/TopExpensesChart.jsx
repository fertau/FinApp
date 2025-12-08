import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/currencyUtils';

export default function TopExpensesChart({ transactions, exchangeRate, currency }) {
    const data = useMemo(() => {
        const totals = {};
        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;

            let amount = Math.abs(t.amount);

            const cat = t.category || 'Otros';
            if (!totals[cat]) totals[cat] = 0;
            totals[cat] += amount;
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [transactions, exchangeRate]);

    const maxVal = data.length > 0 ? data[0].value : 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', height: '100%' }}>
            {data.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ width: '20px', color: 'var(--color-text-tertiary)' }}>{index + 1}.</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>{item.name}</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.value, currency || 'ARS', 0)}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '2px' }}>
                            <div style={{
                                width: `${(item.value / maxVal) * 100}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-accent-primary)',
                                borderRadius: '2px'
                            }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
