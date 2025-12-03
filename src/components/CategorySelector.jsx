import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Sparkles, Plus } from 'lucide-react';

export default function CategorySelector({ value, onChange, categories, subcategories, originalValue, onCreateCategory }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Filter categories based on search
    const filteredCategories = categories?.filter(cat => {
        if (!searchTerm) return true;
        const catMatch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
        const subMatch = subcategories?.some(sub =>
            sub.categoryId === cat.id && sub.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return catMatch || subMatch;
    });

    const getSubcategories = (catId) => subcategories?.filter(s => s.categoryId === catId) || [];

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const isSuggested = value === originalValue;

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {value || 'Uncategorized'}
                    </span>
                    {isSuggested && originalValue && (
                        <Sparkles size={12} color="var(--color-accent-primary)" style={{ flexShrink: 0 }} />
                    )}
                </div>
                <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '250px', // Wider than button
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    marginTop: '4px'
                }}>
                    <div style={{ padding: '0.5rem', position: 'sticky', top: 0, backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                            <Search size={14} style={{ opacity: 0.5 }} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    fontSize: '0.875rem',
                                    color: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '0.5rem' }}>
                        {/* Option to select "Uncategorized" */}
                        <div
                            onClick={() => handleSelect('Uncategorized')}
                            style={{
                                padding: '0.5rem',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                backgroundColor: value === 'Uncategorized' ? 'var(--color-bg-secondary)' : 'transparent'
                            }}
                        >
                            <span>Uncategorized</span>
                            {value === 'Uncategorized' && <Check size={14} />}
                        </div>

                        {filteredCategories?.map(cat => {
                            const catSubs = getSubcategories(cat.id);
                            // Filter subs if searching
                            const visibleSubs = searchTerm
                                ? catSubs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                : catSubs;

                            return (
                                <div key={cat.id} style={{ marginTop: '0.5rem' }}>
                                    {/* Category Header (Selectable) */}
                                    <div
                                        onClick={() => handleSelect(cat.name)}
                                        style={{
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: cat.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            backgroundColor: value === cat.name ? 'var(--color-bg-secondary)' : 'transparent'
                                        }}
                                    >
                                        <span>{cat.name}</span>
                                        {value === cat.name && <Check size={14} />}
                                    </div>

                                    {/* Subcategories */}
                                    <div style={{ paddingLeft: '1rem', borderLeft: `2px solid ${cat.color}33` }}>
                                        {visibleSubs.map(sub => (
                                            <div
                                                key={sub.id}
                                                onClick={() => handleSelect(sub.name)}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.8125rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    backgroundColor: value === sub.name ? 'var(--color-bg-secondary)' : 'transparent',
                                                    color: 'var(--color-text-secondary)'
                                                }}
                                            >
                                                <span>{sub.name}</span>
                                                {value === sub.name && <Check size={12} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredCategories?.length === 0 && searchTerm && (
                            <div
                                onClick={() => {
                                    if (onCreateCategory) {
                                        onCreateCategory(searchTerm);
                                        handleSelect(searchTerm);
                                    }
                                }}
                                style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'var(--color-accent-primary)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    borderTop: '1px solid var(--color-bg-tertiary)',
                                    fontWeight: 600,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                }}
                            >
                                <Plus size={16} />
                                Crear "{searchTerm}"
                            </div>
                        )}

                        {filteredCategories?.length === 0 && !searchTerm && (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                                No categories found.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
