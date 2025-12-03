import React, { useMemo, useState } from 'react';
import { Coffee, ShoppingCart, Home, Car, Zap, DollarSign, ArrowRightLeft, AlertCircle, Edit2, Check, X } from 'lucide-react';
import CategorySelector from './CategorySelector';

const getCategoryIcon = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('comida') || cat.includes('supermercado')) return <ShoppingCart size={18} />;
    if (cat.includes('restaurante') || cat.includes('cafe')) return <Coffee size={18} />;
    if (cat.includes('casa') || cat.includes('hogar')) return <Home size={18} />;
    if (cat.includes('transporte') || cat.includes('auto')) return <Car size={18} />;
    if (cat.includes('servicio') || cat.includes('luz') || cat.includes('gas')) return <Zap size={18} />;
    if (cat.includes('ingreso') || cat.includes('sueldo')) return <DollarSign size={18} />;
    if (cat.includes('transferencia')) return <ArrowRightLeft size={18} />;
    return <AlertCircle size={18} />;
};

export default function TransactionList({ transactions, onUpdateTransaction, categories, subcategories, owners }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const groupedTransactions = useMemo(() => {
        const groups = {};
        transactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        return Object.entries(groups).sort((a, b) => {
            const [d1, m1, y1] = a[0].split(/[-/]/);
            const [d2, m2, y2] = b[0].split(/[-/]/);
            const date1 = new Date(y1.length === 2 ? '20' + y1 : y1, m1 - 1, d1);
            const date2 = new Date(y2.length === 2 ? '20' + y2 : y2, m2 - 1, d2);
            return date2 - date1;
        });
    }, [transactions]);

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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Registros</h2>

            {groupedTransactions.map(([date, trans]) => (
                <div key={date} style={{ marginBottom: '2rem' }}>
                    <h3 style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.75rem',
                        borderBottom: '1px solid var(--color-bg-tertiary)',
                        paddingBottom: '0.5rem'
                    }}>
                        {date}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {trans.map(t => {
                            const isEditing = editingId === t.id;
                            return (
                                <div key={t.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: isEditing ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-bg-tertiary)',
                                    opacity: (!isEditing && t.type === 'EXCLUDED') ? 0.6 : 1,
                                    transition: 'all 0.2s'
                                }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginRight: '1rem',
                                        color: 'var(--color-text-secondary)',
                                        flexShrink: 0
                                    }}>
                                        {getCategoryIcon(isEditing ? editForm.category : t.category)}
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={editForm.description}
                                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <CategorySelector
                                                            value={editForm.category}
                                                            onChange={val => setEditForm({ ...editForm, category: val })}
                                                            categories={categories}
                                                            subcategories={subcategories}
                                                        />
                                                    </div>
                                                    <select
                                                        value={editForm.owner}
                                                        onChange={e => setEditForm({ ...editForm, owner: e.target.value })}
                                                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                    >
                                                        {owners?.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.isExtraordinary || false}
                                                            onChange={e => setEditForm({ ...editForm, isExtraordinary: e.target.checked })}
                                                        />
                                                        Extraordinario
                                                    </label>
                                                    <select
                                                        value={editForm.accrualPeriod || ''}
                                                        onChange={e => setEditForm({ ...editForm, accrualPeriod: e.target.value || null })}
                                                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)' }}
                                                    >
                                                        <option value="">Sin devengamiento</option>
                                                        <option value="annual">Anual</option>
                                                        <option value="semester">Semestral</option>
                                                        <option value="quarter">Trimestral</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 500, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {t.description}
                                                    {t.isExtraordinary && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            backgroundColor: 'var(--color-accent-subtle)',
                                                            color: 'var(--color-accent-primary)',
                                                            padding: '2px 6px',
                                                            borderRadius: '10px',
                                                            fontWeight: 600
                                                        }}>
                                                            EXTRA
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
                                                    <span style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {t.category}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{t.owner}</span>
                                                    <span>•</span>
                                                    <span>{t.account}</span>
                                                    {t.accrualPeriod && (
                                                        <>
                                                            <span>•</span>
                                                            <span style={{ fontStyle: 'italic' }}>
                                                                Devengado: {t.accrualPeriod === 'annual' ? 'Anual' : t.accrualPeriod === 'semester' ? 'Semestral' : 'Trimestral'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Amount & Actions */}
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editForm.amount}
                                                onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)', textAlign: 'right' }}
                                            />
                                        ) : (
                                            <div style={{
                                                fontWeight: 600,
                                                color: t.amount > 0 ? 'var(--color-success)' : 'var(--color-text-primary)'
                                            }}>
                                                {t.currency === 'USD' ? 'USD ' : '$'}
                                                {Math.abs(t.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}

                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={handleSaveClick} style={{ color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                                                <button onClick={handleCancelClick} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEditClick(t)}
                                                style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {transactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
                    No se encontraron registros.
                </div>
            )}
        </div>
    );
}

