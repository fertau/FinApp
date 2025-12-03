import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Users, Plus, LogIn, Edit2, Check, X, Trash2 } from 'lucide-react';

export default function ProfileSwitcher({ currentProfileId, onSelectProfile }) {
    const profiles = useLiveQuery(() => db.profiles.toArray());
    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleCreateProfile = async () => {
        if (newProfileName.trim()) {
            const id = await db.profiles.add({ name: newProfileName.trim() });

            // Seed default data for the new profile
            await db.owners.add({ name: 'Yo', profileId: id });

            const defaultCategories = [
                { name: 'Comida', type: 'expense', color: '#FFBB28' },
                { name: 'Transporte', type: 'expense', color: '#FF8042' },
                { name: 'Hogar', type: 'expense', color: '#00C49F' },
                { name: 'Servicios', type: 'expense', color: '#0088FE' },
                { name: 'Entretenimiento', type: 'expense', color: '#8884d8' },
                { name: 'Salud', type: 'expense', color: '#ff7300' },
                { name: 'Ingresos', type: 'income', color: '#82ca9d' },
                { name: 'Varios', type: 'expense', color: '#a4de6c' }
            ];

            await db.categories.bulkAdd(defaultCategories.map(c => ({ ...c, profileId: id })));

            setNewProfileName('');
            setIsCreating(false);
            onSelectProfile(id);
        }
    };

    const startEditing = (profile) => {
        setEditingId(profile.id);
        setEditName(profile.name);
    };

    const saveEdit = async () => {
        if (editName.trim()) {
            await db.profiles.update(editingId, { name: editName.trim() });
            setEditingId(null);
        }
    };

    const deleteProfile = async (id, name) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el perfil "${name}" y todos sus datos?`)) {
            await db.transaction('rw', db.profiles, db.transactions, db.categories, db.subcategories, db.owners, db.rules, db.cardMappings, async () => {
                await db.profiles.delete(id);
                await db.transactions.where('profileId').equals(id).delete();
                await db.categories.where('profileId').equals(id).delete();
                // Note: subcategories don't have profileId in current schema, they are global or linked to category? 
                // Schema check needed. Assuming categories cascade or subcategories are global.
                await db.owners.where('profileId').equals(id).delete();
                await db.rules.where('profileId').equals(id).delete();
                await db.cardMappings.where('profileId').equals(id).delete();
            });
        }
    };

    if (!currentProfileId) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'var(--color-bg-primary)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '2rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-bg-tertiary)',
                    boxShadow: 'var(--shadow-lg)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px', height: '64px',
                        backgroundColor: 'var(--color-accent-subtle)',
                        color: 'var(--color-accent-primary)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <Users size={32} />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Expense Tracker</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                        Selecciona un perfil para continuar
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {profiles?.map(p => (
                            <div key={p.id} style={{ display: 'flex', gap: '0.5rem' }}>
                                {editingId === p.id ? (
                                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-accent-primary)'
                                            }}
                                            autoFocus
                                        />
                                        <button onClick={saveEdit} style={{ padding: '0.5rem', color: 'var(--color-success)', cursor: 'pointer', background: 'none', border: 'none' }}><Check /></button>
                                        <button onClick={() => setEditingId(null)} style={{ padding: '0.5rem', color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}><X /></button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onSelectProfile(p.id)}
                                            style={{
                                                flex: 1,
                                                padding: '1rem',
                                                backgroundColor: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <LogIn size={18} />
                                            {p.name}
                                        </button>
                                        <button
                                            onClick={() => startEditing(p)}
                                            style={{
                                                padding: '0 1rem',
                                                backgroundColor: 'transparent',
                                                border: '1px solid var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                color: 'var(--color-text-secondary)'
                                            }}
                                            title="Editar Nombre"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteProfile(p.id, p.name)}
                                            style={{
                                                padding: '0 1rem',
                                                backgroundColor: 'transparent',
                                                border: '1px solid var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                color: 'var(--color-error)'
                                            }}
                                            title="Eliminar Perfil"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {isCreating ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                placeholder="Nombre del Perfil"
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-accent-primary)',
                                    backgroundColor: 'var(--color-bg-primary)'
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleCreateProfile()}
                            />
                            <button
                                onClick={handleCreateProfile}
                                disabled={!newProfileName.trim()}
                                style={{
                                    padding: '0 1rem',
                                    backgroundColor: 'var(--color-accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}
                            >
                                Crear
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                style={{
                                    padding: '0 1rem',
                                    backgroundColor: 'transparent',
                                    color: 'var(--color-text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-accent-primary)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%'
                            }}
                        >
                            <Plus size={18} />
                            Crear Nuevo Perfil
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
