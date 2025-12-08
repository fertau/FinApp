import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { User, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function MemberManager({ profileId }) {
    const members = useLiveQuery(
        () => profileId ? db.members.where('profileId').equals(profileId).toArray() : [],
        [profileId]
    );

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const startEditing = (member) => {
        setEditingId(member.id);
        setEditName(member.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdateMember = async (id) => {
        if (!editName.trim()) return;

        const member = members.find(m => m.id === id);
        if (!member) return;

        const oldName = member.name;
        const newName = editName.trim();

        if (oldName === newName) {
            cancelEditing();
            return;
        }

        // 1. Update Member
        await db.members.update(id, { name: newName });

        // 2. Batch Update Transactions
        const affectedTransactions = await db.transactions
            .where('profileId').equals(profileId)
            .filter(t => t.owner === oldName)
            .toArray();

        if (affectedTransactions.length > 0) {
            await db.transactions
                .where('profileId').equals(profileId)
                .filter(t => t.owner === oldName)
                .modify({ owner: newName });

            console.log(`Updated ${affectedTransactions.length} transactions from owner "${oldName}" to "${newName}"`);
        }

        cancelEditing();
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        const name = e.target.elements.name.value.trim();
        if (name && profileId) {
            await db.members.add({ name, profileId });
            e.target.reset();
        }
    };

    const handleDeleteMember = async (id) => {
        if (window.confirm('¿Eliminar usuario? Esto no borrará sus transacciones históricas.')) {
            await db.members.delete(id);
        }
    };

    return (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} />
                Usuarios (Miembros)
            </h3>

            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                    name="name"
                    placeholder="Nuevo usuario (ej. Juan)"
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-bg-tertiary)' }}
                />
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    <Plus size={18} />
                </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {members?.map(member => (
                    <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-bg-tertiary)'
                    }}>
                        {editingId === member.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--color-accent-primary)', width: '100px' }}
                                    autoFocus
                                />
                                <button onClick={() => handleUpdateMember(member.id)} style={{ color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} /></button>
                                <button onClick={cancelEditing} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                            </div>
                        ) : (
                            <>
                                <span style={{ fontWeight: 500 }}>{member.name}</span>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '0.5rem' }}>
                                    <button
                                        onClick={() => startEditing(member)}
                                        style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        title="Renombrar"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMember(member.id)}
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
        </div>
    );
}
