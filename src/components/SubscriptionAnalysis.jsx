import React, { useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function SubscriptionAnalysis({ transactions, exchangeRate }) {
    const subscriptions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        // 1. Group expenses by description (normalized)
        const groups = {};

        transactions.forEach(t => {
            // Only look at real expenses
            if (t.type !== 'REAL_EXPENSE') return;

            // Normalize description: remove numbers, dates, and extra spaces
            // E.g., "NETFLIX.COM 12/12" -> "NETFLIX.COM"
            const cleanDesc = t.description
                .replace(/\d{2}\/\d{2}/g, '') // Remove dates like 12/12
                .replace(/\d+/g, '')          // Remove other numbers
                .replace(/\s+/g, ' ')         // Collapse spaces
                .trim()
                .toUpperCase();

            // Use first 10 chars as key for grouping to catch variations? 
            // Or just use the clean description. Let's try clean description.
            const key = cleanDesc;

            if (!groups[key]) {
                groups[key] = {
                    name: t.description, // Keep one original name for display
                    cleanName: key,
                    transactions: [],
                    totalAmount: 0
                };
            }
            groups[key].transactions.push(t);

            // Normalize amount to ARS for comparison
            let amount = Math.abs(t.amount);
            if (t.currency === 'USD') {
                amount *= exchangeRate;
            }
            groups[key].totalAmount += amount;
        });

        // 2. Analyze groups for patterns
        const detected = [];
        const KNOWN_SUBSCRIPTIONS = ['NETFLIX', 'SPOTIFY', 'YOUTUBE', 'APPLE', 'GOOGLE', 'AMAZON PRIME', 'DISNEY', 'HBO', 'STAR+', 'PARAMOUNT', 'CLARIN', 'LA NACION', 'INFOBAE', 'OPENAI', 'CLAUDE', 'GITHUB', 'MIDJOURNEY'];

        Object.values(groups).forEach(group => {
            const txs = group.transactions;
            // If it's a known subscription, even 1 transaction might be enough to flag it as "Active" if it's recent?
            // But for "Recurring", let's stick to 2, or 1 if it's very recent.
            // Let's stick to 2 for now to avoid false positives, but relax the variance.

            if (txs.length < 2) return;

            // Sort by date
            txs.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Check frequency
            const uniqueMonths = new Set(txs.map(t => t.date.substring(0, 7))).size;

            // Check amount variance
            const amounts = txs.map(t => Math.abs(t.currency === 'USD' ? t.amount * exchangeRate : t.amount));
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

            // Variance tolerance: 10% for unknown, 50% for known (prices change, plans change)
            const isKnown = KNOWN_SUBSCRIPTIONS.some(k => group.cleanName.includes(k));
            const tolerance = isKnown ? 0.5 : 0.1;

            const variance = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < tolerance);

            // Heuristic: 
            // - At least 2 unique months
            // - Low variance in amount OR it's a known service

            const isSubscription = (uniqueMonths >= 2 && (variance || isKnown));

            if (isSubscription) {
                detected.push({
                    id: group.cleanName,
                    name: group.name,
                    avgAmount: avgAmount,
                    frequency: 'Mensual', // Assumed
                    lastPayment: txs[txs.length - 1].date,
                    history: txs
                });
            }
        });

        return detected.sort((a, b) => b.avgAmount - a.avgAmount);
    }, [transactions, exchangeRate]);

    const totalMonthly = subscriptions.reduce((sum, sub) => sum + sub.avgAmount, 0);

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {/* Summary Card */}
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '48px', height: '48px',
                        backgroundColor: 'var(--color-accent-subtle)',
                        color: 'var(--color-accent-primary)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Costo Fijo Mensual Estimado</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ${totalMonthly.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '48px', height: '48px',
                        backgroundColor: '#f0fdf4', // Green 50
                        color: 'var(--color-success)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Suscripciones Activas</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {subscriptions.length}
                        </h3>
                    </div>
                </div>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Suscripciones Detectadas</h3>

            {subscriptions.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)'
                }}>
                    <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>No se detectaron suscripciones recurrentes aún.</p>
                    <p style={{ fontSize: '0.875rem' }}>Sube más historiales para mejorar la detección.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {subscriptions.map(sub => (
                        <div key={sub.id} style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-bg-tertiary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 600,
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    {sub.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{sub.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        Último pago: {sub.lastPayment} • {sub.frequency}
                                    </p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontWeight: 600, fontSize: '1.125rem' }}>
                                    ${sub.avgAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>promedio</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
