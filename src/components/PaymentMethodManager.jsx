import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CreditCard, Wallet, Plus, Trash2 } from 'lucide-react';

export default function PaymentMethodManager({ profileId }) {
    const paymentMethods = useLiveQuery(
        () => profileId ? db.paymentMethods.where('profileId').equals(profileId).toArray() : [],
        [profileId]
    );

    const [isCreating, setIsCreating] = useState(false);
    const [newMethod, setNewMethod] = useState({ name: '', type: 'credit_card', currency: 'ARS' });

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
                        {pm.type === 'cash' ? <Wallet size={16} /> : <CreditCard size={16} />}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{pm.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{pm.currency}</span>
                        </div>
                        <button
                            onClick={() => handleDelete(pm.id)}
                            style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '0.5rem' }}
                        >
                            <Trash2 size={14} />
                        </button>
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
