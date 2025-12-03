import React, { useMemo } from 'react';
import { Wallet, CreditCard, Landmark } from 'lucide-react';

export default function AccountsWidget({ transactions, exchangeRate = 1000 }) {
    const ownerExpenses = useMemo(() => {
        const expenses = {};
        let total = 0;

        transactions.forEach(t => {
            // Only consider expenses
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;

            const owner = t.owner || 'Desconocido';
            if (!expenses[owner]) expenses[owner] = 0;

            // Convert to ARS for total
            let amount = Math.abs(t.amount);
            if (t.currency === 'USD') {
                amount *= exchangeRate;
            }

            expenses[owner] += amount;
            total += amount;
        });

        return {
            byOwner: Object.entries(expenses).sort((a, b) => b[1] - a[1]),
            total
        };
    }, [transactions, exchangeRate]);

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Resumen de Gastos</h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
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
                        ${ownerExpenses.total.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                            {((amount / ownerExpenses.total) * 100).toFixed(1)}% del total
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
