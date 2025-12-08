import React, { useState, useEffect } from 'react';
import { RecurrenceDetectionService } from '../../services/RecurrenceDetectionService';
import { formatCurrency } from '../../utils/currencyUtils';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';

export default function SubscriptionsWidget({ transactions, currency = 'ARS' }) {
    const [recurringExpenses, setRecurringExpenses] = useState([]);
    const [upcomingRenewals, setUpcomingRenewals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRecurringExpenses();
    }, [transactions]);

    const loadRecurringExpenses = async () => {
        setIsLoading(true);
        try {
            // Get user ID from auth context (for now, use 'default')
            const userId = localStorage.getItem('userId') || 'default';

            // Get all recurring expenses from DB
            let expenses = await RecurrenceDetectionService.getAllRecurringExpenses(userId);

            // If none exist, try to detect them from transactions
            if (expenses.length === 0 && transactions.length > 0) {
                const detected = await RecurrenceDetectionService.detectRecurringTransactions(transactions);

                // Save detected recurring expenses
                for (const expense of detected) {
                    if (expense.confidence > 70) { // Only save high-confidence detections
                        await RecurrenceDetectionService.saveRecurringExpense(userId, expense);
                    }
                }

                // Reload from DB
                expenses = await RecurrenceDetectionService.getAllRecurringExpenses(userId);
            }

            // Filter active expenses
            const active = expenses.filter(e => e.active);
            setRecurringExpenses(active);

            // Get upcoming renewals (next 7 days)
            const upcoming = await RecurrenceDetectionService.getUpcomingRenewals(userId, 7);
            setUpcomingRenewals(upcoming);

        } catch (error) {
            console.error('Error loading recurring expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalMonthly = recurringExpenses.reduce((sum, exp) => {
        // Convert to monthly equivalent
        let monthlyAmount = exp.amount;
        if (exp.frequency === 'weekly') monthlyAmount *= 4.33;
        else if (exp.frequency === 'biweekly') monthlyAmount *= 2.17;
        else if (exp.frequency === 'quarterly') monthlyAmount /= 3;
        else if (exp.frequency === 'yearly') monthlyAmount /= 12;

        return sum + monthlyAmount;
    }, 0);

    const getFrequencyLabel = (frequency) => {
        const labels = {
            weekly: 'Semanal',
            biweekly: 'Quincenal',
            monthly: 'Mensual',
            quarterly: 'Trimestral',
            yearly: 'Anual'
        };
        return labels[frequency] || frequency;
    };

    const getDaysUntilText = (daysUntil) => {
        if (daysUntil === 0) return 'Hoy';
        if (daysUntil === 1) return 'Mañana';
        return `En ${daysUntil} días`;
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Analizando gastos recurrentes...</p>
            </div>
        );
    }

    if (recurringExpenses.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <Clock size={48} style={{ color: 'var(--color-text-tertiary)' }} />
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    No se detectaron gastos recurrentes.<br />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                        Importa más transacciones para identificar suscripciones.
                    </span>
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            {/* Summary Card */}
            <div style={{
                backgroundColor: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-accent-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <TrendingUp size={20} style={{ color: 'var(--color-accent-primary)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                        {recurringExpenses.length} Suscripciones Activas
                    </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {formatCurrency(totalMonthly, currency, 0)}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mes</span>
                </div>
            </div>

            {/* Upcoming Renewals Alert */}
            {upcomingRenewals.length > 0 && (
                <div style={{
                    backgroundColor: 'var(--color-warning-subtle, #FEF3C7)',
                    border: '1px solid var(--color-warning, #F59E0B)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '0.5rem'
                }}>
                    <AlertCircle size={18} style={{ color: 'var(--color-warning, #F59E0B)', marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-warning-dark, #D97706)', marginBottom: '0.25rem' }}>
                            Próximas Renovaciones
                        </div>
                        {upcomingRenewals.slice(0, 2).map(exp => (
                            <div key={exp.id} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                {exp.name} • {getDaysUntilText(exp.daysUntil)} • {formatCurrency(exp.amount, exp.currency)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top 3 Subscriptions */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Principales Gastos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {recurringExpenses
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 3)
                        .map(exp => (
                            <div key={exp.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                backgroundColor: 'var(--color-bg-primary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-bg-tertiary)'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                        {exp.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                        {getFrequencyLabel(exp.frequency)}
                                        {exp.category && ` • ${exp.category}`}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                        {formatCurrency(exp.amount, exp.currency)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                        {new Date(exp.nextOccurrence).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
