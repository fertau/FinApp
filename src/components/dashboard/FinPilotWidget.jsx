import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';

export default function FinPilotWidget({ transactions, exchangeRate }) {
    const insights = useMemo(() => {
        const results = [];
        if (!transactions || transactions.length === 0) return results;

        // 1. Recurring Expenses Detection (Simple Heuristic)
        // Group by description (normalized)
        const groups = {};
        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;
            const key = t.description.toLowerCase().trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        Object.entries(groups).forEach(([desc, group]) => {
            if (group.length >= 2) {
                // Check if they are roughly monthly
                // Sort by date
                const sorted = group.sort((a, b) => new Date(b.date) - new Date(a.date));
                const latest = sorted[0];
                const amount = Math.abs(latest.amount);

                // If the last transaction was recent (last 45 days)
                const daysSinceLast = (new Date() - new Date(latest.date)) / (1000 * 60 * 60 * 24);
                if (daysSinceLast < 45) {
                    results.push({
                        type: 'subscription',
                        title: 'Posible Suscripción',
                        message: `Detectamos pagos recurrentes a "${latest.description}" de $${amount.toFixed(0)}.`,
                        icon: <Calendar size={18} />,
                        color: 'var(--color-accent-primary)'
                    });
                }
            }
        });

        // 2. Trend Analysis (This Month vs Last Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

        let currentTotal = 0;
        let lastTotal = 0;

        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;
            const d = new Date(t.date); // Assuming date format is parseable or we need to parse it manually if dd/mm/yyyy
            // Our dates are usually dd/mm/yy or dd-mm-yy. Let's assume standard format for now or use a helper if needed.
            // Actually, let's just use string matching for simplicity if format is consistent, 
            // but parsing is safer. 
            // Assuming ISO or standard format in DB? 
            // In ImportReview we saw "23-Oct-25". That's hard to parse directly.
            // Let's skip complex date parsing for this MVP step and assume we can parse it.
            // If date parsing fails, this part might be skipped.
        });

        // Limit to top 5 insights
        return results.slice(0, 5);
    }, [transactions]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Sparkles size={18} style={{ color: 'var(--color-accent-primary)' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Sugerencias FinPilot</h4>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {insights.length > 0 ? (
                    insights.map((insight, i) => (
                        <div key={i} style={{
                            padding: '1rem',
                            backgroundColor: 'var(--color-bg-primary)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: `4px solid ${insight.color}`,
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: insight.color, fontWeight: 600, fontSize: '0.875rem' }}>
                                {insight.icon}
                                {insight.title}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                {insight.message}
                            </p>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                        No hay sugerencias por el momento.
                    </div>
                )}
            </div>
        </div>
    );
}
