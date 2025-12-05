import React, { useState, useEffect } from 'react';
import { Plus, X, LayoutGrid, Pin } from 'lucide-react';
import { AVAILABLE_WIDGETS } from './dashboard/WidgetRegistry';

export default function Dashboard({ transactions, exchangeRate, categories, subcategories }) {
    // Default widgets
    const DEFAULT_WIDGETS = ['finpilot_suggestions', 'category_chart', 'monthly_flow_chart', 'owner_chart', 'top_expenses_chart'];

    const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
        const saved = localStorage.getItem('dashboardWidgets');
        return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    });

    const [isCustomizing, setIsCustomizing] = useState(false);

    useEffect(() => {
        localStorage.setItem('dashboardWidgets', JSON.stringify(activeWidgetIds));
    }, [activeWidgetIds]);

    const addWidget = (id) => {
        if (!activeWidgetIds.includes(id)) {
            setActiveWidgetIds([...activeWidgetIds, id]);
        }
    };

    const removeWidget = (id) => {
        setActiveWidgetIds(activeWidgetIds.filter(wId => wId !== id));
    };

    // Get last 5 transactions for the list (always shown at bottom or side)
    const recentTransactions = transactions.slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Header / Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Dashboard</h2>
                <button
                    onClick={() => setIsCustomizing(!isCustomizing)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: isCustomizing ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                        color: isCustomizing ? 'white' : 'var(--color-text-primary)',
                        border: '1px solid var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    <LayoutGrid size={18} />
                    {isCustomizing ? 'Terminar Edición' : 'Personalizar'}
                </button>
            </div>

            {/* Customization Panel */}
            {isCustomizing && (
                <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-accent-primary)',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Widgets Disponibles</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {AVAILABLE_WIDGETS.map(widget => {
                            const isActive = activeWidgetIds.includes(widget.id);
                            return (
                                <div key={widget.id} style={{
                                    padding: '1rem',
                                    border: `1px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                                    opacity: isActive ? 0.8 : 1
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 600 }}>{widget.title}</span>
                                        <button
                                            onClick={() => isActive ? removeWidget(widget.id) : addWidget(widget.id)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: isActive ? 'var(--color-error)' : 'var(--color-success)'
                                            }}
                                        >
                                            {isActive ? <X size={20} /> : <Plus size={20} />}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                        {widget.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Widgets Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '2rem',
                alignItems: 'start' // Prevent stretching
            }}>
                {activeWidgetIds.map(id => {
                    const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === id);
                    if (!widgetDef) return null;
                    const WidgetComponent = widgetDef.component;

                    // Determine span based on defaultSize (simple logic for now)
                    const gridColumn = widgetDef.defaultSize.w > 1 ? '1 / -1' : 'auto';

                    return (
                        <div key={id} style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-bg-tertiary)',
                            height: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow-sm)',
                            gridColumn: gridColumn,
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{widgetDef.title}</h3>
                                {isCustomizing && (
                                    <button
                                        onClick={() => removeWidget(id)}
                                        style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <WidgetComponent
                                    transactions={transactions}
                                    exchangeRate={exchangeRate}
                                    categories={categories}
                                    subcategories={subcategories}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity List (Always visible at bottom) */}
            <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Actividad Reciente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {recentTransactions.map(t => (
                        <div key={t.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-bg-tertiary)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div>
                                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {t.description}
                                    {t.isExtraordinary && (
                                        <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-primary)', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>EXTRA</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                    {t.date} • {t.category}
                                </div>
                            </div>
                            <div style={{
                                fontWeight: 600,
                                color: t.amount > 0 ? 'var(--color-success)' : 'var(--color-text-primary)'
                            }}>
                                {t.currency === 'USD' ? 'USD ' : '$'}
                                {Math.abs(t.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                    {recentTransactions.length === 0 && (
                        <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                            No hay actividad reciente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
