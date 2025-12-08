import React, { useMemo, useState } from 'react';
import { Coffee, ShoppingCart, Home, Car, Zap, DollarSign, ArrowRightLeft, AlertCircle, Edit2, Check, X, Trash2, Calendar, CreditCard, AlertTriangle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';
import CategorySelector from './CategorySelector';
import CategorySuggestionModal from './CategorySuggestionModal';

export default function TransactionList({ transactions, onUpdateTransaction, onDeleteTransaction, categories, subcategories, members, paymentMethods }) {
    const [viewMode, setViewMode] = useState('date'); // 'date' | 'paymentMethod'
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [suggestingTransaction, setSuggestingTransaction] = useState(null);

    // Grouping Logic
    const groupedTransactions = useMemo(() => {
        const groups = {};

        if (viewMode === 'date') {
            transactions.forEach(t => {
                if (!groups[t.date]) groups[t.date] = [];
                groups[t.date].push(t);
            });
            // Sort dates descending
            return Object.entries(groups).sort((a, b) => {
                const [d1, m1, y1] = a[0].split(/[-/]/);
                const [d2, m2, y2] = b[0].split(/[-/]/);
                const date1 = new Date(y1.length === 2 ? '20' + y1 : y1, m1 - 1, d1);
                const date2 = new Date(y2.length === 2 ? '20' + y2 : y2, m2 - 1, d2);
                return date2 - date1;
            });
        } else {
            // Group by Payment Method
            transactions.forEach(t => {
                const pm = t.paymentMethod || 'Sin Medio de Pago';
                if (!groups[pm]) groups[pm] = [];
                groups[pm].push(t);
            });
            // Sort by PM name? Or maybe put "Sin Medio de Pago" last?
            return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
        }
    }, [transactions, viewMode]);

    const handleEditClick = (t) => {
        setEditingId(t.id);
        setEditForm({ ...t });
    };

    const handleSaveClick = async () => {
        if (onUpdateTransaction) {
            await onUpdateTransaction(editingId, editForm);
        }
        setEditingId(null);
    };

    const handleCancelClick = () => {
        setEditingId(null);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
            if (onDeleteTransaction) await onDeleteTransaction(id);
        }
    };

    const handleChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleToggleExclude = async (t) => {
        const newType = t.type === 'EXCLUDED' ? 'expense' : 'EXCLUDED';
        // If it was income, maybe we should restore to income? 
        // For now default to expense, or check amount sign?
        // Let's check amount: if positive -> income, negative -> expense.
        const restoredType = t.amount > 0 ? 'income' : 'expense';

        const finalType = t.type === 'EXCLUDED' ? restoredType : 'EXCLUDED';

        if (onUpdateTransaction) {
            await onUpdateTransaction(t.id, { ...t, type: finalType });
        }
    };

    const handleSuggestCategory = (transaction) => {
        setSuggestingTransaction(transaction);
    };

    const handleApplySuggestion = async (categoryData) => {
        if (onUpdateTransaction && suggestingTransaction) {
            await onUpdateTransaction(suggestingTransaction.id, {
                ...suggestingTransaction,
                category: categoryData.category,
                subcategory: categoryData.subcategory
            });
        }
        setSuggestingTransaction(null);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Registros</h2>

                <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-bg-tertiary)' }}>
                    <button
                        onClick={() => setViewMode('date')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: viewMode === 'date' ? 'var(--color-bg-primary)' : 'transparent',
                            color: viewMode === 'date' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            boxShadow: viewMode === 'date' ? 'var(--shadow-sm)' : 'none'
                        }}
                    >
                        <Calendar size={16} /> Por Fecha
                    </button>
                    <button
                        onClick={() => setViewMode('paymentMethod')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: viewMode === 'paymentMethod' ? 'var(--color-bg-primary)' : 'transparent',
                            color: viewMode === 'paymentMethod' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            boxShadow: viewMode === 'paymentMethod' ? 'var(--shadow-sm)' : 'none'
                        }}
                    >
                        <CreditCard size={16} /> Por Medio Pago
                    </button>
                </div>
            </div>

            {/* List Groups */}
            {groupedTransactions.map(([groupKey, trans]) => (
                <div key={groupKey} style={{ marginBottom: '3rem' }}>
                    <h3 style={{
                        fontSize: '1rem',
                        color: 'var(--color-accent-primary)',
                        marginBottom: '1rem',
                        borderBottom: '2px solid var(--color-bg-tertiary)',
                        paddingBottom: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        {viewMode === 'date' ? <Calendar size={18} /> : <CreditCard size={18} />}
                        {groupKey}
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 'auto' }}>
                            {trans.length} registros • Total: {(() => {
                                const sum = trans.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -Math.abs(t.amount)), 0);
                                const allUSD = trans.every(t => t.currency === 'USD');
                                return formatCurrency(sum, allUSD ? 'USD' : 'ARS');
                            })()}
                        </span>
                    </h3>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Fecha</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Descripción
                                            <button
                                                onClick={() => setShowFullDescription(!showFullDescription)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 0, display: 'flex' }}
                                                title={showFullDescription ? "Contraer texto" : "Ver todo el texto"}
                                            >
                                                {showFullDescription ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Monto</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Cuota</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Medio Pago</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Dueño</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Categoría</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Extra</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Devengado</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trans.map(t => {
                                    const isEditing = editingId === t.id;
                                    const isExcluded = t.type === 'EXCLUDED';

                                    return (
                                        <tr key={t.id} style={{
                                            borderBottom: '1px solid var(--color-bg-tertiary)',
                                            backgroundColor: isEditing ? 'var(--color-bg-secondary)' : 'transparent',
                                            opacity: (!isEditing && isExcluded) ? 0.5 : 1
                                        }}>
                                            {/* Date */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.date}
                                                        onChange={e => handleChange('date', e.target.value)}
                                                        style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                    />
                                                ) : t.date}
                                            </td>

                                            {/* Description */}
                                            <td style={{
                                                padding: '0.5rem',
                                                maxWidth: showFullDescription ? 'none' : '400px',
                                                minWidth: '250px',
                                                verticalAlign: 'top'
                                            }}>
                                                {isEditing ? (
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={e => handleChange('description', e.target.value)}
                                                        style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', minHeight: '60px' }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            whiteSpace: showFullDescription ? 'normal' : 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'help',
                                                            wordBreak: 'break-word'
                                                        }}
                                                        title={t.description}
                                                    >
                                                        {t.description}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <select
                                                            value={editForm.currency}
                                                            onChange={e => handleChange('currency', e.target.value)}
                                                            style={{ padding: '2px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', fontSize: '0.7rem' }}
                                                        >
                                                            <option value="ARS">ARS</option>
                                                            <option value="USD">USD</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            value={editForm.amount}
                                                            onChange={e => handleChange('amount', parseFloat(e.target.value))}
                                                            style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', textAlign: 'right' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span style={{
                                                        fontWeight: 500,
                                                        color: t.amount > 0 ? 'var(--color-success)' : 'var(--color-text-primary)'
                                                    }}>
                                                        {formatCurrency(t.amount, t.currency)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Installment */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <input
                                                            type="number"
                                                            value={editForm.installment || ''}
                                                            onChange={e => handleChange('installment', parseInt(e.target.value) || null)}
                                                            placeholder="#"
                                                            style={{ width: '30px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                        />
                                                        /
                                                        <input
                                                            type="number"
                                                            value={editForm.totalInstallments || ''}
                                                            onChange={e => handleChange('totalInstallments', parseInt(e.target.value) || null)}
                                                            placeholder="#"
                                                            style={{ width: '30px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    t.isInstallment ? (
                                                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-primary)', borderRadius: '4px' }}>
                                                            {t.installment}/{t.totalInstallments}
                                                        </span>
                                                    ) : '-'
                                                )}
                                            </td>

                                            {/* Payment Method */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.paymentMethod || ''}
                                                        onChange={e => handleChange('paymentMethod', e.target.value)}
                                                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', maxWidth: '120px' }}
                                                    >
                                                        <option value="">-</option>
                                                        {/* Ensure current value is an option if not in list */}
                                                        {editForm.paymentMethod && !paymentMethods?.some(pm => pm.name === editForm.paymentMethod) && (
                                                            <option value={editForm.paymentMethod}>{editForm.paymentMethod}</option>
                                                        )}
                                                        {paymentMethods?.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                                                    </select>
                                                ) : t.paymentMethod || '-'}
                                            </td>

                                            {/* Owner */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.owner || ''}
                                                        onChange={e => handleChange('owner', e.target.value)}
                                                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', maxWidth: '100px' }}
                                                    >
                                                        <option value="">-</option>
                                                        {members?.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                    </select>
                                                ) : t.owner || '-'}
                                            </td>

                                            {/* Category */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <CategorySelector
                                                        value={editForm.category}
                                                        onChange={val => handleChange('category', val)}
                                                        categories={categories}
                                                        subcategories={subcategories}
                                                        compact={true}
                                                    />
                                                ) : (
                                                    <span style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                        {t.category}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Extra */}
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.isExtraordinary || false}
                                                        onChange={e => handleChange('isExtraordinary', e.target.checked)}
                                                    />
                                                ) : (
                                                    t.isExtraordinary && <span style={{ color: 'var(--color-accent-primary)', fontSize: '0.7rem', fontWeight: 600 }}>SI</span>
                                                )}
                                            </td>

                                            {/* Accrual */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.accrualPeriod || ''}
                                                        onChange={e => handleChange('accrualPeriod', e.target.value || null)}
                                                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', fontSize: '0.75rem' }}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="annual">Anual</option>
                                                        <option value="semester">Semestral</option>
                                                        <option value="quarter">Trimestral</option>
                                                    </select>
                                                ) : (
                                                    t.accrualPeriod ? <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>{t.accrualPeriod}</span> : '-'
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '0.5rem' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button onClick={handleSaveClick} style={{ color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={16} /></button>
                                                        <button onClick={handleCancelClick} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            onClick={() => handleToggleExclude(t)}
                                                            title={isExcluded ? "Incluir" : "Excluir"}
                                                            style={{ color: isExcluded ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            {isExcluded ? <Check size={16} /> : <AlertTriangle size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSuggestCategory(t)}
                                                            title="Sugerir Categoría con IA"
                                                            style={{ color: 'var(--color-accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            <Sparkles size={16} />
                                                        </button>
                                                        <button onClick={() => handleEditClick(t)} style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteClick(t.id)} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {transactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
                    No se encontraron registros.
                </div>
            )}

            {/* Category Suggestion Modal */}
            {suggestingTransaction && (
                <CategorySuggestionModal
                    transaction={suggestingTransaction}
                    suggestion={null}
                    onApply={handleApplySuggestion}
                    onSkip={() => setSuggestingTransaction(null)}
                    onClose={() => setSuggestingTransaction(null)}
                />
            )}
        </div>
    );
}
