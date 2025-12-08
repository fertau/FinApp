import React, { useState, useEffect } from 'react';
import { RecurrenceDetectionService } from '../services/RecurrenceDetectionService';
import { formatCurrency } from '../utils/currencyUtils';
import { Clock, Edit2, Trash2, CheckCircle, XCircle, Plus, RefreshCw } from 'lucide-react';

export default function RecurringExpensesView() {
    const [recurringExpenses, setRecurringExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadRecurringExpenses();
    }, []);

    const loadRecurringExpenses = async () => {
        setIsLoading(true);
        try {
            const userId = localStorage.getItem('userId') || 'default';
            const expenses = await RecurrenceDetectionService.getAllRecurringExpenses(userId);
            setRecurringExpenses(expenses.sort((a, b) => b.active - a.active || b.amount - a.amount));
        } catch (error) {
            console.error('Error loading recurring expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        try {
            await RecurrenceDetectionService.updateRecurringExpense(id, { active: !currentActive });
            await loadRecurringExpenses();
        } catch (error) {
            console.error('Error toggling expense:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este gasto recurrente?')) return;

        try {
            await RecurrenceDetectionService.deleteRecurringExpense(id);
            await loadRecurringExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

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

    const getMonthlyEquivalent = (amount, frequency) => {
        let monthly = amount;
        if (frequency === 'weekly') monthly *= 4.33;
        else if (frequency === 'biweekly') monthly *= 2.17;
        else if (frequency === 'quarterly') monthly /= 3;
        else if (frequency === 'yearly') monthly /= 12;
        return monthly;
    };

    const totalMonthly = recurringExpenses
        .filter(e => e.active)
        .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount, exp.frequency), 0);

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Cargando gastos recurrentes...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Gastos Recurrentes</h1>
                    <button
                        onClick={loadRecurringExpenses}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--color-accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        <RefreshCw size={16} />
                        Actualizar
                    </button>
                </div>

                {/* Summary Card */}
                <div style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    border: '2px solid var(--color-accent-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Total Mensual (Activos)
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                            {formatCurrency(totalMonthly, 'ARS', 0)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Suscripciones
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                            {recurringExpenses.filter(e => e.active).length}
                            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                                /{recurringExpenses.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            {recurringExpenses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)'
                }}>
                    <Clock size={64} style={{ color: 'var(--color-text-tertiary)', marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        No hay gastos recurrentes
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Importa transacciones para que se detecten automáticamente
                    </p>
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Estado</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Nombre</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Monto</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Frecuencia</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Próxima Fecha</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Categoría</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recurringExpenses.map(exp => (
                                <tr key={exp.id} style={{
                                    borderBottom: '1px solid var(--color-bg-tertiary)',
                                    opacity: exp.active ? 1 : 0.5
                                }}>
                                    <td style={{ padding: '1rem' }}>
                                        <button
                                            onClick={() => handleToggleActive(exp.id, exp.active)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={exp.active ? 'Desactivar' : 'Activar'}
                                        >
                                            {exp.active ? (
                                                <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                                            ) : (
                                                <XCircle size={20} style={{ color: 'var(--color-text-tertiary)' }} />
                                            )}
                                        </button>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{exp.name}</div>
                                        {exp.confidence && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                Confianza: {exp.confidence}%
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {formatCurrency(exp.amount, exp.currency)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                            ~{formatCurrency(getMonthlyEquivalent(exp.amount, exp.frequency), exp.currency, 0)}/mes
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {getFrequencyLabel(exp.frequency)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {new Date(exp.nextOccurrence).toLocaleDateString('es-AR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div>{exp.category || '-'}</div>
                                        {exp.subcategory && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                {exp.subcategory}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-error)',
                                                    padding: '0.25rem'
                                                }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
