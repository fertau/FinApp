import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CreditCard, Plus, Trash2 } from 'lucide-react';

export default function CardMapping({ profileId }) {
    const mappings = useLiveQuery(() =>
        db.cardMappings.where('profileId').equals(profileId || 0).toArray()
        , [profileId]);

    const members = useLiveQuery(() =>
        db.members.where('profileId').equals(profileId || 0).toArray()
        , [profileId]);

    const [last4, setLast4] = useState('');
    const [selectedOwner, setSelectedOwner] = useState('');

    const handleAddMapping = async () => {
        if (last4.length === 4 && selectedOwner) {
            await db.cardMappings.add({
                last4,
                owner: selectedOwner,
                profileId
            });
            setLast4('');
            setSelectedOwner('');
        }
    };

    const handleDeleteMapping = async (id) => {
        await db.cardMappings.delete(id);
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
                <CreditCard size={20} />
                Card Mappings
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Map the last 4 digits of a card to a specific owner.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                    type="text"
                    value={last4}
                    onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Last 4 Digits"
                    style={{
                        width: '120px',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}
                />
                <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}
                >
                    <option value="">Select Owner...</option>
                    {members?.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleAddMapping}
                    disabled={last4.length !== 4 || !selectedOwner}
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
                        opacity: (last4.length !== 4 || !selectedOwner) ? 0.5 : 1
                    }}
                >
                    <Plus size={16} />
                    Add
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {mappings?.map(m => (
                    <div key={m.id} style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                                **** {m.last4}
                            </span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>→</span>
                            <span style={{ fontWeight: 500 }}>{m.owner}</span>
                        </div>
                        <button
                            onClick={() => handleDeleteMapping(m.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-tertiary)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
