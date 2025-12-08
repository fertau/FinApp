import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CreditCard, Wallet, Plus, Trash2, Edit2, Check, X, Landmark, Smartphone, Banknote } from 'lucide-react';

export default function PaymentMethodManager({ profileId }) {
    const paymentMethods = useLiveQuery(
        () => profileId ? db.paymentMethods.where('profileId').equals(profileId).toArray() : [],
        [profileId]
    );

    const [isCreating, setIsCreating] = useState(false);
    const [newMethod, setNewMethod] = useState({ name: '', type: 'credit_card', currency: 'ARS' });

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('credit_card');

    const startEditing = (pm) => {
        setEditingId(pm.id);
        setEditName(pm.name);
        setEditType(pm.type || 'credit_card');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdate = async (id) => {
        if (!editName.trim()) return;

        const pm = paymentMethods.find(p => p.id === id);
        if (!pm) return;

        const oldName = pm.name;
        const newName = editName.trim();
        const newType = editType;

        if (oldName === newName && pm.type === newType) {
            cancelEditing();
            return;
        }

        // 1. Update Payment Method
        await db.paymentMethods.update(id, { name: newName, type: newType });

        // 2. Batch Update Transactions
        // Find all transactions with this payment method and profile
        const affectedTransactions = await db.transactions
            .where('profileId').equals(profileId)
            .filter(t => t.paymentMethod === oldName)
            .toArray();

        if (affectedTransactions.length > 0) {
            const updates = affectedTransactions.map(t => ({
                key: t.id,
                changes: { paymentMethod: newName }
            }));

            // Dexie doesn't have a simple bulkUpdate for non-primary keys without fetching first or using modify
            // .modify() is good but we need to be careful with the query.
            // Let's use the collection modify
            await db.transactions
                .where('profileId').equals(profileId)
                .filter(t => t.paymentMethod === oldName)
                .modify({ paymentMethod: newName });

            console.log(`Updated ${affectedTransactions.length} transactions from "${oldName}" to "${newName}"`);
        }

        cancelEditing();
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (newMethod.name && profileId) {
            await db.paymentMethods.add({ ...newMethod, profileId });
            setNewMethod({ name: '', type: 'credit_card', currency: 'ARS' });
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar medio de pago?')) {
            await db.paymentMethods.delete(id);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'credit_card': return <CreditCard size={16} />;
            case 'debit_card': return <CreditCard size={16} />; // Maybe add a badge or different color? Or just same icon.
            case 'cash': return <Banknote size={16} />;
            case 'bank_account': return <Landmark size={16} />;
            case 'app': return <Smartphone size={16} />;
            default: return <Wallet size={16} />;
        }
    };

    return (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} />
                Medios de Pago
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {paymentMethods?.map(pm => (
                    <div key={pm.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)'
                    }}>
                        {getIcon(pm.type)}

                        {editingId === pm.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--color-accent-primary)', width: '120px' }}
                                    autoFocus
                                />
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value)}
                                    style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--color-accent-primary)', fontSize: '0.8rem' }}
                                >
                                    <option value="credit_card">Crédito</option>
                                    <option value="debit_card">Débito</option>
                                    <option value="cash">Efectivo</option>
                                    <option value="bank_account">Banco</option>
                                    <option value="app">App</option>
                                </select>
                                <button onClick={() => handleUpdate(pm.id)} style={{ color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} /></button>
                                <button onClick={cancelEditing} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 500 }}>{pm.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{pm.currency}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '0.5rem' }}>
                                    <button
                                        onClick={() => startEditing(pm)}
                                        style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        title="Renombrar"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pm.id)}
                                        style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {isCreating ? (
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--color-bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                    <input
                        value={newMethod.name}
                        onChange={e => setNewMethod({ ...newMethod, name: e.target.value })}
                        placeholder="Nombre (ej. Visa Galicia)"
                        style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-bg-tertiary)' }}
                        autoFocus
                    />
                    <select
                        value={newMethod.type}
                        onChange={e => setNewMethod({ ...newMethod, type: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-bg-tertiary)' }}
                    >
                        <option value="credit_card">Tarjeta Crédito</option>
                        <option value="debit_card">Tarjeta Débito</option>
                        <option value="cash">Efectivo</option>
                        <option value="bank_account">Cuenta Bancaria</option>
                        <option value="app">Billetera Virtual (MP, etc)</option>
                    </select>
                    <select
                        value={newMethod.currency}
                        onChange={e => setNewMethod({ ...newMethod, currency: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-bg-tertiary)' }}
                    >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                    </select>
                    <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                        Guardar
                    </button>
                    <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                        Cancelar
                    </button>
                </form>
            ) : (
                <button
                    onClick={() => setIsCreating(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px dashed var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'center',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    <Plus size={18} />
                    Agregar Medio de Pago
                </button>
            )}
        </div>
    );
}
