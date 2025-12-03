import React, { useState } from 'react';
import { Save, X, Check, AlertTriangle } from 'lucide-react';
import CategorySelector from './CategorySelector';

export default function ImportReview({ transactions, onSave, onCancel, owners, categories, subcategories, settings, onCreateCategory }) {
    const [editedTransactions, setEditedTransactions] = useState(transactions);

    const handleChange = (index, field, value) => {
        const newTrans = [...editedTransactions];
        newTrans[index] = { ...newTrans[index], [field]: value };
        setEditedTransactions(newTrans);
    };

    const handleToggleExclude = (index) => {
        const newTrans = [...editedTransactions];
        const currentType = newTrans[index].type;
        newTrans[index] = {
            ...newTrans[index],
            type: currentType === 'EXCLUDED' ? 'expense' : 'EXCLUDED'
        };
        setEditedTransactions(newTrans);
    };

    const totalAmount = editedTransactions.reduce((sum, t) => {
        if (t.type === 'EXCLUDED') return sum;
        return sum + (t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount));
    }, 0);

    // Batch Owner Mapping Logic
    const [showOwnerMapping, setShowOwnerMapping] = useState(false);
    const [detectedOwners, setDetectedOwners] = useState([]);
    const [ownerMappings, setOwnerMappings] = useState({});

    // Bulk Selection State
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    const toggleSelection = (index) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIndices.size === editedTransactions.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(editedTransactions.map((_, i) => i)));
        }
    };

    const handleBulkCategory = (categoryName) => {
        if (!categoryName) return;
        const newTrans = [...editedTransactions];
        selectedIndices.forEach(index => {
            newTrans[index] = { ...newTrans[index], category: categoryName };
        });
        setEditedTransactions(newTrans);
        // Keep selection or clear? Let's keep it for now in case they want to do more.
    };

    const handleBulkOwner = (ownerName) => {
        if (!ownerName) return;
        const newTrans = [...editedTransactions];
        selectedIndices.forEach(index => {
            newTrans[index] = { ...newTrans[index], owner: ownerName };
        });
        setEditedTransactions(newTrans);
    };

    const handleBulkDelete = () => {
        if (!window.confirm(`¿Eliminar ${selectedIndices.size} transacciones seleccionadas?`)) return;
        const newTrans = editedTransactions.filter((_, i) => !selectedIndices.has(i));
        setEditedTransactions(newTrans);
        setSelectedIndices(new Set());
    };

    // Identify unknown owners on load
    React.useEffect(() => {
        const uniqueDetected = [...new Set(transactions.map(t => t.owner).filter(o => o))];
        const unknown = uniqueDetected.filter(d => !owners?.some(o => o.name === d));

        if (unknown.length > 0) {
            setDetectedOwners(unknown);
            // Initialize mappings with empty or best guess
            const initialMappings = {};
            unknown.forEach(u => initialMappings[u] = '');
            setOwnerMappings(initialMappings);
            setShowOwnerMapping(true);
        }
    }, [transactions, owners]);

    const handleApplyMappings = () => {
        const newTrans = editedTransactions.map(t => {
            if (t.owner && ownerMappings[t.owner]) {
                return { ...t, owner: ownerMappings[t.owner] };
            }
            return t;
        });
        setEditedTransactions(newTrans);
        setShowOwnerMapping(false);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--color-bg-primary)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Owner Mapping Modal */}
            {showOwnerMapping && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 200
                }}>
                    <div style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ marginBottom: '1rem' }}>Asignar Dueños Detectados</h3>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            Hemos detectado nombres en el archivo que no coinciden con tus dueños registrados.
                            Asígnalos ahora para actualizar todas las transacciones.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {detectedOwners.map(detected => (
                                <div key={detected} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 500 }}>{detected}</span>
                                    <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                                    <select
                                        value={ownerMappings[detected] || ''}
                                        onChange={(e) => setOwnerMappings(prev => ({ ...prev, [detected]: e.target.value }))}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            color: 'inherit',
                                            width: '200px'
                                        }}
                                    >
                                        <option value="">(Mantener original)</option>
                                        {owners?.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => setShowOwnerMapping(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                Omitir
                            </button>
                            <button
                                onClick={handleApplyMappings}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'var(--color-accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Aplicar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{
                padding: '1rem 2rem',
                borderBottom: '1px solid var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-bg-secondary)'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Revisar Importación</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        {editedTransactions.length} transacciones encontradas. Total: <span style={{ fontWeight: 600, color: totalAmount >= 0 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>${totalAmount.toFixed(2)}</span>
                    </p>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedIndices.size > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        backgroundColor: 'var(--color-accent-subtle)',
                        padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-accent-primary)'
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-accent-primary)', fontSize: '0.875rem' }}>
                            {selectedIndices.size} seleccionados
                        </span>

                        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-accent-primary)', opacity: 0.3 }}></div>

                        <select
                            onChange={(e) => handleBulkOwner(e.target.value)}
                            value=""
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-accent-primary)', fontSize: '0.8rem' }}
                        >
                            <option value="">Asignar Dueño...</option>
                            {owners?.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                        </select>

                        <CategorySelector
                            value=""
                            onChange={handleBulkCategory}
                            categories={categories}
                            subcategories={subcategories}
                            onCreateCategory={onCreateCategory}
                            placeholder="Asignar Categoría..."
                            compact={true}
                        />

                        <button
                            onClick={handleBulkDelete}
                            style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}
                        >
                            <Trash2 size={14} /> Eliminar
                        </button>

                        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-accent-primary)', opacity: 0.3 }}></div>

                        <button
                            onClick={() => setSelectedIndices(new Set())}
                            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                            OK / Deseleccionar
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>

                    <button
                        onClick={async () => {
                            try {
                                const { categorizeWithLocalAI } = await import('../utils/localAICategorizer');
                                alert('Cargando modelo de IA local... esto puede tardar unos segundos la primera vez.');
                                const updated = await categorizeWithLocalAI(editedTransactions, categories);
                                setEditedTransactions(updated);
                                alert('Categorización Local completada!');
                            } catch (e) {
                                console.error(e);
                                alert('Error Local AI: ' + e.message);
                            }
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--color-text-secondary)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        🧠 IA Local (Gratis)
                    </button>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <X size={18} /> Cancelar
                    </button>
                    <button
                        onClick={() => onSave(editedTransactions)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--color-accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        <Check size={18} /> Aprobar y Guardar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.size === editedTransactions.length && editedTransactions.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Fecha</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Descripción</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Monto</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Cuota</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Medio Pago</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Dueño</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Categoría</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Extra</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Devengado</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editedTransactions.map((t, i) => {
                                const isExcluded = t.type === 'EXCLUDED';
                                return (
                                    <tr key={i} style={{
                                        borderBottom: '1px solid var(--color-bg-tertiary)',
                                        opacity: isExcluded ? 0.5 : 1,
                                        backgroundColor: isExcluded ? 'var(--color-bg-secondary)' : 'transparent',
                                        textDecoration: isExcluded ? 'line-through' : 'none'
                                    }}>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIndices.has(i)}
                                                onChange={() => toggleSelection(i)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={t.date}
                                                onChange={(e) => handleChange(i, 'date', e.target.value)}
                                                disabled={isExcluded}
                                                style={{ width: '80px', background: 'transparent', border: 'none', color: 'inherit' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div className="tooltip-container" style={{ position: 'relative', width: '100%' }}>
                                                <input
                                                    type="text"
                                                    value={t.description}
                                                    onChange={(e) => handleChange(i, 'description', e.target.value)}
                                                    disabled={isExcluded}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', textOverflow: 'ellipsis' }}
                                                />
                                                <span className="tooltip-text" style={{
                                                    visibility: 'hidden',
                                                    width: 'max-content',
                                                    backgroundColor: 'black',
                                                    color: '#fff',
                                                    textAlign: 'center',
                                                    borderRadius: '6px',
                                                    padding: '5px 10px',
                                                    position: 'absolute',
                                                    zIndex: 9999, // High z-index to show above everything
                                                    bottom: '100%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    opacity: 0,
                                                    transition: 'opacity 0.3s'
                                                }}>
                                                    {t.description}
                                                </span>
                                                <style>{`
                                                    .tooltip-container:hover .tooltip-text {
                                                        visibility: visible;
                                                        opacity: 1;
                                                    }
                                                `}</style>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{t.currency}</span>
                                                <input
                                                    type="number"
                                                    value={t.amount}
                                                    onChange={(e) => handleChange(i, 'amount', parseFloat(e.target.value))}
                                                    disabled={isExcluded}
                                                    style={{ width: '80px', background: 'transparent', border: 'none', color: t.amount < 0 ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 500 }}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            {t.isInstallment ? (
                                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-primary)', borderRadius: 'var(--radius-sm)' }}>
                                                    {t.installment}/{t.totalInstallments}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {t.paymentMethod || '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select
                                                value={t.owner || ''}
                                                onChange={(e) => handleChange(i, 'owner', e.target.value)}
                                                disabled={isExcluded}
                                                style={{ background: 'transparent', border: '1px solid var(--color-bg-tertiary)', borderRadius: '4px', padding: '2px', color: 'inherit', maxWidth: '150px' }}
                                            >
                                                <option value="">Select...</option>
                                                {/* If the current owner is not in the list, show it as an option */}
                                                {t.owner && !owners?.some(o => o.name === t.owner) && (
                                                    <option value={t.owner}>Detected: {t.owner}</option>
                                                )}
                                                {owners?.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <CategorySelector
                                                value={t.category}
                                                originalValue={t.originalCategory}
                                                onChange={(val) => handleChange(i, 'category', val)}
                                                categories={categories}
                                                subcategories={subcategories}
                                                onCreateCategory={onCreateCategory}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={t.isExtraordinary || false}
                                                onChange={(e) => handleChange(i, 'isExtraordinary', e.target.checked)}
                                                disabled={isExcluded}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select
                                                value={t.accrualPeriod || ''}
                                                onChange={(e) => handleChange(i, 'accrualPeriod', e.target.value || null)}
                                                disabled={isExcluded}
                                                style={{ background: 'transparent', border: '1px solid var(--color-bg-tertiary)', borderRadius: '4px', padding: '2px', color: 'inherit', maxWidth: '100px', fontSize: '0.75rem' }}
                                            >
                                                <option value="">-</option>
                                                <option value="annual">Anual</option>
                                                <option value="semester">Semestral</option>
                                                <option value="quarter">Trimestral</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleToggleExclude(i)}
                                                title={isExcluded ? "Include" : "Exclude"}
                                                style={{
                                                    color: isExcluded ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                                                    background: 'none', border: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                {isExcluded ? <Check size={16} /> : <AlertTriangle size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleRemove(i)}
                                                title="Delete completely"
                                                style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Helper icon
function Trash2({ size }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    )
}
