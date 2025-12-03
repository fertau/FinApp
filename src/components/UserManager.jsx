import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { User, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function UserManager({ profileId }) {
    const owners = useLiveQuery(() =>
        db.owners.where('profileId').equals(profileId || 0).toArray()
        , [profileId]);

    const [newOwnerName, setNewOwnerName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleAddOwner = async () => {
        if (newOwnerName.trim()) {
            await db.owners.add({
                name: newOwnerName.trim(),
                profileId
            });
            setNewOwnerName('');
        }
    };

    const handleDeleteOwner = async (id) => {
        if (window.confirm('¿Estás seguro? Esto no borrará sus transacciones, pero podría afectar el filtrado.')) {
            await db.owners.delete(id);
        }
    };

    const startEditing = (owner) => {
        setEditingId(owner.id);
        setEditName(owner.name);
    };

    const saveEdit = async () => {
        if (editName.trim()) {
            await db.owners.update(editingId, { name: editName.trim() });
            setEditingId(null);
        }
    };

    return (
        <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-bg-tertiary)',
            marginBottom: '2rem'
        }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} />
                Gestión de Dueños
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Administra las personas o entidades que pueden asignarse a las transacciones (ej. "Fernando", "Jesi").
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="Nombre del Nuevo Dueño"
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}
                />
                <button
                    onClick={handleAddOwner}
                    disabled={!newOwnerName.trim()}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        backgroundColor: 'var(--color-accent-primary)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: !newOwnerName.trim() ? 0.5 : 1
                    }}
                >
                    <Plus size={16} />
                    Agregar
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {owners?.map(owner => (
                    <div key={owner.id} style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {editingId === owner.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '0.25rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-accent-primary)',
                                        fontSize: '0.875rem'
                                    }}
                                    autoFocus
                                />
                                <button onClick={saveEdit} style={{ padding: '2px', color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={16} /></button>
                                <button onClick={() => setEditingId(null)} style={{ padding: '2px', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <span style={{ fontWeight: 500, flex: 1 }}>{owner.name}</span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => startEditing(owner)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        title="Editar Dueño"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOwner(owner.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-text-tertiary)',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        title="Eliminar Dueño"
                                    >
                                        <Trash2 size={16} />
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
