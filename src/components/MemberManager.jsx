import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { User, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function MemberManager({ profileId }) {
    const members = useLiveQuery(
        () => profileId ? db.members.where('profileId').equals(profileId).toArray() : [],
        [profileId]
    );

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
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                        <button
                            onClick={() => handleDeleteMember(member.id)}
                            style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
