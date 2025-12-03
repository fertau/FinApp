import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Tag, Plus, Trash2, ChevronRight, ChevronDown, X } from 'lucide-react';

export default function CategoryManager({ profileId }) {
    const categories = useLiveQuery(() =>
        db.categories.where('profileId').equals(profileId || 0).toArray()
        , [profileId]);

    const subcategories = useLiveQuery(() => db.subcategories.toArray());

    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('expense');
    const [expandedCat, setExpandedCat] = useState(null);
    const [newSubName, setNewSubName] = useState('');

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState(null); // { type: 'category' | 'subcategory', id: string, data: object }

    const handleDragStart = (e, type, item) => {
        setDraggedItem({ type, id: item.id, data: item });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnCategory = async (e, targetCatId) => {
        e.preventDefault();
        if (!draggedItem) return;

        // Case 1: Dragging a Subcategory -> Move to this Category
        if (draggedItem.type === 'subcategory') {
            if (draggedItem.data.categoryId === targetCatId) return; // Same category
            await db.subcategories.update(draggedItem.id, { categoryId: targetCatId });
        }

        // Case 2: Dragging a Category -> Convert to Subcategory of this Category
        if (draggedItem.type === 'category') {
            if (draggedItem.id === targetCatId) return; // Cannot drop on itself

            if (window.confirm(`¿Convertir categoría "${draggedItem.data.name}" en subcategoría de este grupo?`)) {
                await db.transaction('rw', db.categories, db.subcategories, db.rules, db.transactions, async () => {
                    // 1. Create new subcategory
                    const newSubId = await db.subcategories.add({
                        categoryId: targetCatId,
                        name: draggedItem.data.name
                    });

                    // 2. Move existing subcategories of the dragged category
                    const childSubs = await db.subcategories.where({ categoryId: draggedItem.id }).toArray();
                    for (const sub of childSubs) {
                        await db.subcategories.update(sub.id, { categoryId: targetCatId });
                    }

                    // 3. Update transactions
                    const targetCat = await db.categories.get(targetCatId);
                    await db.transactions
                        .where({ category: draggedItem.data.name })
                        .modify({ category: targetCat.name, subcategory: draggedItem.data.name });

                    // 4. Delete old category
                    await db.categories.delete(draggedItem.id);
                });
            }
        }
        setDraggedItem(null);
    };

    const handleDropOnRoot = async (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        // Case 3: Dragging a Subcategory -> Convert to Category
        if (draggedItem.type === 'subcategory') {
            if (window.confirm(`¿Convertir subcategoría "${draggedItem.data.name}" en categoría principal?`)) {
                await db.transaction('rw', db.categories, db.subcategories, db.transactions, async () => {
                    // 1. Create new category
                    const newCatId = await db.categories.add({
                        name: draggedItem.data.name,
                        type: 'expense', // Default
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                        profileId
                    });

                    // 2. Update transactions
                    await db.transactions
                        .where({ subcategory: draggedItem.data.name })
                        .modify({ category: draggedItem.data.name, subcategory: null });

                    // 3. Delete subcategory
                    await db.subcategories.delete(draggedItem.id);
                });
            }
        }
        setDraggedItem(null);
    };

    const handleAddCategory = async () => {
        if (newCatName.trim()) {
            await db.categories.add({
                name: newCatName.trim(),
                type: newCatType,
                color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                profileId
            });
            setNewCatName('');
        }
    };

    const handleAddSubcategory = async (categoryId) => {
        if (newSubName.trim()) {
            await db.subcategories.add({
                categoryId,
                name: newSubName.trim()
            });
            setNewSubName('');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('¿Eliminar categoría? Esto también eliminará las subcategorías y reglas asociadas.')) {
            await db.transaction('rw', db.categories, db.subcategories, db.rules, async () => {
                await db.categories.delete(id);
                await db.subcategories.where({ categoryId: id }).delete();
                await db.rules.where({ categoryId: id }).delete();
            });
        }
    };

    const getSubcategories = (catId) => subcategories?.filter(s => s.categoryId === catId) || [];

    return (
        <div
            onDragOver={handleDragOver}
            onDrop={handleDropOnRoot}
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-bg-tertiary)',
                marginBottom: '2rem',
                minHeight: '200px' // Ensure drop area
            }}
        >
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} />
                Categorías Inteligentes
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Arrastra categorías para anidarlas o convertirlas.
            </p>

            {/* Add Category */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }} onDragOver={(e) => e.stopPropagation()}>
                <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nombre de Nueva Categoría"
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}
                />
                <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value)}
                    style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-bg-tertiary)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)'
                    }}
                >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                </select>
                <button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim()}
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
                        opacity: !newCatName.trim() ? 0.5 : 1
                    }}
                >
                    <Plus size={16} />
                    Agregar
                </button>
            </div>

            {/* List Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categories?.map(cat => (
                    <div
                        key={cat.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'category', cat)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                            e.stopPropagation(); // Prevent root drop
                            handleDropOnCategory(e, cat.id);
                        }}
                        style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-bg-tertiary)',
                            overflow: 'hidden',
                            opacity: draggedItem?.id === cat.id ? 0.5 : 1
                        }}
                    >
                        <div style={{
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            backgroundColor: expandedCat === cat.id ? 'var(--color-bg-tertiary)' : 'transparent'
                        }} onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {expandedCat === cat.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <div style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    backgroundColor: cat.color
                                }} />
                                <span style={{ fontWeight: 500 }}>{cat.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                                    ({cat.type === 'expense' ? 'Gasto' : 'Ingreso'})
                                </span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Subcategories */}
                        {expandedCat === cat.id && (
                            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-bg-tertiary)' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }} onDragOver={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={newSubName}
                                        onChange={(e) => setNewSubName(e.target.value)}
                                        placeholder="Nueva Subcategoría"
                                        style={{
                                            flex: 1,
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            fontSize: '0.875rem'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAddSubcategory(cat.id); }}
                                        disabled={!newSubName.trim()}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Agregar
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {getSubcategories(cat.id).map(sub => (
                                        <span
                                            key={sub.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.stopPropagation();
                                                handleDragStart(e, 'subcategory', sub);
                                            }}
                                            style={{
                                                fontSize: '0.875rem',
                                                padding: '2px 8px',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: 'grab',
                                                opacity: draggedItem?.id === sub.id ? 0.5 : 1
                                            }}
                                        >
                                            {sub.name}
                                            <X size={12} style={{ cursor: 'pointer' }} onClick={async (e) => {
                                                e.stopPropagation();
                                                await db.subcategories.delete(sub.id);
                                            }} />
                                        </span>
                                    ))}
                                    {getSubcategories(cat.id).length === 0 && (
                                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>Sin subcategorías</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
