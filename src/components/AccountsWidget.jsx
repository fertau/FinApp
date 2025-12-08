import React, { useMemo } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';

export default function AccountsWidget({ transactions, currency = 'ARS' }) {
    // Calculate Totals (transactions are already filtered and converted)
    const ownerExpenses = useMemo(() => {
        const expenses = {};
        let total = 0;

        transactions.forEach(t => {
            // Only consider expenses
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;

            const owner = t.owner || 'Desconocido';
            if (!expenses[owner]) expenses[owner] = 0;

            // Amount is already converted and negative for expenses
            const amount = Math.abs(t.amount);

            expenses[owner] += amount;
            total += amount;
        });

        return {
            byOwner: Object.entries(expenses).sort((a, b) => b[1] - a[1]),
            total
        };
    }, [transactions]);

    return (
        <div style={{ marginBottom: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                flex: 1,
                alignContent: 'center'
            }}>
                {/* Total Card */}
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{
                            padding: '0.5rem',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-accent-subtle)',
                            color: 'var(--color-accent-primary)'
                        }}>
                            <Wallet size={20} />
                        </div>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Gastos</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {formatCurrency(ownerExpenses.total, currency, 0)}
                    </div>
                </div>

                {/* Owner Cards */}
                {ownerExpenses.byOwner.map(([owner, amount]) => (
                    <div key={owner} style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-bg-tertiary)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-secondary)'
                            }}>
                                <CreditCard size={20} />
                            </div>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{owner}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {formatCurrency(amount, currency, 0)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                            {ownerExpenses.total > 0 ? ((amount / ownerExpenses.total) * 100).toFixed(1) : 0}% del total
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
