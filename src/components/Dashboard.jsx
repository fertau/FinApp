import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, LayoutGrid, Pin, ArrowRightLeft } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import { AVAILABLE_WIDGETS } from './dashboard/WidgetRegistry';
import TimeRangeSelector, { TIME_RANGES } from './dashboard/TimeRangeSelector';
import MonthNavigator from './dashboard/MonthNavigator';
import { ExchangeRateService } from '../services/ExchangeRateService';
import { getStartOfMonth, getEndOfMonth } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';

export default function Dashboard({ transactions, exchangeRate, categories, subcategories, paymentMethods, apiKey }) {
    // Default widgets
    const DEFAULT_WIDGETS = ['accounts_summary', 'finpilot_suggestions', 'category_chart', 'monthly_flow_chart', 'owner_chart', 'top_expenses_chart'];

    const [activeWidgets, setActiveWidgets] = useState(() => {
        const saved = localStorage.getItem('dashboardWidgetsV2');
        if (saved) return JSON.parse(saved);

        // Migration from V1 (array of strings) to V2 (array of objects)
        const savedV1 = localStorage.getItem('dashboardWidgets');
        if (savedV1) {
            const ids = JSON.parse(savedV1);
            return ids.map(id => {
                const def = AVAILABLE_WIDGETS.find(w => w.id === id);
                return { id, colSpan: def ? def.defaultSize.w : 1 };
            });
        }

        // Default
        return DEFAULT_WIDGETS.map(id => {
            const def = AVAILABLE_WIDGETS.find(w => w.id === id);
            return { id, colSpan: def ? def.defaultSize.w : 1 };
        });
    });

    const [isCustomizing, setIsCustomizing] = useState(false);

    // Global Filter State
    const [selectedRange, setSelectedRange] = useState('THIS_MONTH');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [displayCurrency, setDisplayCurrency] = useState('ARS'); // 'ARS' or 'USD'
    const [processedTransactions, setProcessedTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('dashboardWidgetsV2', JSON.stringify(activeWidgets));
    }, [activeWidgets]);

    // Smart Date Default: If current month is empty, switch to last month with data
    useEffect(() => {
        if (transactions.length === 0) return;

        const now = new Date();
        const startOfCurrentMonth = getStartOfMonth(now);
        const hasDataThisMonth = transactions.some(t => {
            if (!t.date) return false;
            const [d, m, y] = t.date.split(/[-/]/);
            const tDate = new Date(y.length === 2 ? '20' + y : y, m - 1, d);
            return tDate >= startOfCurrentMonth;
        });

        if (!hasDataThisMonth && selectedRange === 'THIS_MONTH') {
            // Find the latest transaction date
            const latestTx = [...transactions].sort((a, b) => {
                const dateA = new Date(a.date.split(/[-/]/).reverse().join('-'));
                const dateB = new Date(b.date.split(/[-/]/).reverse().join('-'));
                return dateB - dateA;
            })[0];

            if (latestTx) {
                // Check if latest tx is in previous month
                const [d, m, y] = latestTx.date.split(/[-/]/);
                const latestDate = new Date(y.length === 2 ? '20' + y : y, m - 1, d);

                // If latest date is not in current month, we could switch to 'LAST_MONTH' or 'ALL'
                // But 'LAST_MONTH' is specific. Let's just switch to 'ALL' or 'YTD' if it's very old?
                // Or better, just inform the user? 
                // The user asked: "Si en ese mes no hay gastos, indica 'No hay datos de XX guardados aún'".
                // So maybe we don't switch automatically, but show a message?
                // "Si en ese mes no hay gastos, indica 'No hay datos de XX guardados aún'."
                // Okay, I will stick to the user request: Show a message instead of switching.
            }
        }
    }, [transactions, selectedRange]);

    // Centralized Filtering & Conversion Logic
    useEffect(() => {
        const processData = async () => {
            setIsLoading(true);
            try {
                // 1. Calculate Date Range
                const now = new Date();
                let end = new Date();
                let start = new Date();
                end.setHours(23, 59, 59, 999); // Default end to end of today, will be overridden for specific ranges

                const rangeDef = TIME_RANGES.find(r => r.value === selectedRange);

                if (selectedRange === 'THIS_MONTH') {
                    start = getStartOfMonth(now);
                    end = getEndOfMonth(now);
                } else if (selectedRange === 'LAST_MONTH') {
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    start = getStartOfMonth(lastMonth);
                    end = getEndOfMonth(lastMonth);
                } else if (selectedRange === 'CUSTOM_MONTH') {
                    start = getStartOfMonth(currentDate);
                    end = getEndOfMonth(currentDate);
                } else if (selectedRange === 'ALL') {
                    start = new Date(0);
                } else if (selectedRange === 'YTD') {
                    start = new Date(new Date().getFullYear(), 0, 1);
                } else if (rangeDef && rangeDef.days) {
                    start.setDate(start.getDate() - rangeDef.days);
                    start.setHours(0, 0, 0, 0);
                }

                // 2. Filter Transactions
                const filtered = transactions.filter(t => {
                    if (!t.date) return false;
                    const [d, m, y] = t.date.split(/[-/]/);
                    const tDate = new Date(y.length === 2 ? '20' + y : y, m - 1, d);
                    return tDate >= start && tDate <= end;
                });

                // 3. Convert Currency
                const rateCache = {};
                const converted = [];

                for (const t of filtered) {
                    let amount = Math.abs(t.amount);
                    let convertedAmount = amount;

                    if (displayCurrency === 'ARS' && t.currency === 'USD') {
                        let rate = rateCache[t.date];
                        if (!rate) {
                            rate = await ExchangeRateService.getRate(t.date, 'USD');
                            rateCache[t.date] = rate;
                        }
                        convertedAmount = amount * rate;
                    } else if (displayCurrency === 'USD' && t.currency === 'ARS') {
                        let rate = rateCache[t.date];
                        if (!rate) {
                            rate = await ExchangeRateService.getRate(t.date, 'USD');
                            rateCache[t.date] = rate;
                        }
                        convertedAmount = amount / rate;
                    }

                    converted.push({
                        ...t,
                        amount: t.type === 'expense' || t.type === 'REAL_EXPENSE' ? -convertedAmount : convertedAmount,
                        originalAmount: t.amount,
                        originalCurrency: t.currency,
                        currency: displayCurrency
                    });
                }

                setProcessedTransactions(converted);
            } catch (error) {
                console.error("Error processing dashboard data:", error);
                setProcessedTransactions([]);
            } finally {
                setIsLoading(false);
            }
        };

        processData();
    }, [transactions, selectedRange, displayCurrency, currentDate]);

    const toggleWidget = (widgetId) => {
        setActiveWidgets(prev => {
            if (prev.find(w => w.id === widgetId)) {
                return prev.filter(w => w.id !== widgetId);
            } else {
                const def = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                return [...prev, { id: widgetId, colSpan: def ? def.defaultSize.w : 1 }];
            }
        });
    };

    const moveWidget = (dragIndex, hoverIndex) => {
        const newOrder = [...activeWidgets];
        const draggedItem = newOrder[dragIndex];
        newOrder.splice(dragIndex, 1);
        newOrder.splice(hoverIndex, 0, draggedItem);
        setActiveWidgets(newOrder);
    };

    const resizeWidget = (index, delta) => {
        setActiveWidgets(prev => {
            const newWidgets = [...prev];
            const widget = newWidgets[index];
            const def = AVAILABLE_WIDGETS.find(w => w.id === widget.id);
            if (!def) return prev;

            const newSpan = Math.max(def.minColSpan || 1, Math.min(def.maxColSpan || 3, widget.colSpan + delta));
            newWidgets[index] = { ...widget, colSpan: newSpan };
            return newWidgets;
        });
    };

    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    const handleDragStart = (e, index, fromPalette = false, widgetId = null) => {
        if (fromPalette) {
            e.dataTransfer.setData("widgetId", widgetId);
            e.dataTransfer.effectAllowed = "copy";
        } else {
            setDraggedItemIndex(index);
            e.dataTransfer.effectAllowed = "move";
        }
    };

    const handleDragOver = (index) => {
        if (draggedItemIndex === null) return; // Only reorder if dragging existing widget
        const dragIndex = draggedItemIndex;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        moveWidget(dragIndex, hoverIndex);
        setDraggedItemIndex(hoverIndex);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    const handleDrop = (e) => {
        const widgetId = e.dataTransfer.getData("widgetId");
        if (widgetId) {
            // Dropped from palette
            if (!activeWidgets.find(w => w.id === widgetId)) {
                const def = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                setActiveWidgets(prev => [...prev, { id: widgetId, colSpan: def ? def.defaultSize.w : 1 }]);
            }
        }
        setDraggedItemIndex(null);
    };

    // Get last 5 transactions for the list (always shown at bottom or side)
    // Use processedTransactions to show converted amounts
    const recentTransactions = processedTransactions.slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Header / Toolbar */}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Dashboard</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Currency Toggle */}
                    <button
                        onClick={() => setDisplayCurrency(prev => prev === 'ARS' ? 'USD' : 'ARS')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-accent-primary)',
                            backgroundColor: 'var(--color-accent-subtle)',
                            color: 'var(--color-accent-primary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}
                    >
                        <ArrowRightLeft size={16} />
                        {displayCurrency}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <TimeRangeSelector selectedRange={selectedRange} onRangeChange={setSelectedRange} />
                        {selectedRange === 'CUSTOM_MONTH' && (
                            <MonthNavigator currentDate={currentDate} onMonthChange={setCurrentDate} />
                        )}
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
                            {isCustomizing ? 'Listo' : 'Personalizar'}
                        </button>
                    </div>
                </div>
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
                            const isActive = activeWidgets.find(w => w.id === widget.id);
                            return (
                                <div
                                    key={widget.id}
                                    draggable={!isActive}
                                    onDragStart={(e) => !isActive && handleDragStart(e, null, true, widget.id)}
                                    style={{
                                        padding: '1rem',
                                        border: `1px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-primary)',
                                        opacity: isActive ? 0.6 : 1,
                                        cursor: isActive ? 'default' : 'grab'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 600 }}>{widget.title}</span>
                                        <button
                                            onClick={() => toggleWidget(widget.id)}
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

            {isLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Actualizando datos...
                </div>
            ) : processedTransactions.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No hay datos para el período seleccionado.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Intenta cambiar el rango de fechas o importar nuevos gastos.</p>
                </div>
            ) : (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)', // 3 Columns
                        gap: '1.5rem',
                        alignItems: 'stretch'
                    }}>
                    {activeWidgets.map((widget, index) => {
                        const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === widget.id);
                        if (!widgetDef) return null;
                        const WidgetComponent = widgetDef.component;

                        // Use stored colSpan
                        const gridColumn = `span ${widget.colSpan}`;

                        return (
                            <div key={widget.id} style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-bg-tertiary)',
                                minHeight: '350px',
                                height: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: 'var(--shadow-sm)',
                                gridColumn: gridColumn,
                                position: 'relative',
                                opacity: draggedItemIndex === index ? 0.5 : 1,
                                cursor: isCustomizing ? 'grab' : 'default',
                                transition: 'transform 0.2s ease'
                            }}
                                draggable={isCustomizing}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
                                onDragEnd={handleDragEnd}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{widgetDef.title}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {isCustomizing && (
                                                <>
                                                    {/* Resize Controls */}
                                                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '0.5rem', gap: '2px' }}>
                                                        <button
                                                            onClick={() => resizeWidget(index, -1)}
                                                            disabled={widget.colSpan <= (widgetDef.minColSpan || 1)}
                                                            style={{ background: 'none', border: '1px solid var(--color-bg-tertiary)', borderRadius: '4px', cursor: 'pointer', padding: '0 4px', fontSize: '10px', color: 'var(--color-text-secondary)' }}
                                                        >
                                                            &lt;
                                                        </button>
                                                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{widget.colSpan}x</span>
                                                        <button
                                                            onClick={() => resizeWidget(index, 1)}
                                                            disabled={widget.colSpan >= (widgetDef.maxColSpan || 3)}
                                                            style={{ background: 'none', border: '1px solid var(--color-bg-tertiary)', borderRadius: '4px', cursor: 'pointer', padding: '0 4px', fontSize: '10px', color: 'var(--color-text-secondary)' }}
                                                        >
                                                            &gt;
                                                        </button>
                                                    </div>

                                                    <div style={{ cursor: 'grab', marginRight: '0.5rem', color: 'var(--color-text-tertiary)' }} title="Arrastrar para mover">
                                                        ⠿
                                                    </div>
                                                    <button
                                                        onClick={() => toggleWidget(widget.id)}
                                                        style={{
                                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)'
                                                        }}
                                                        title="Ocultar Widget"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                                    <ErrorBoundary>
                                        <WidgetComponent
                                            transactions={processedTransactions}
                                            exchangeRate={exchangeRate} // Keep passing it, though widgets should rely on processed data mostly
                                            categories={categories}
                                            subcategories={subcategories}
                                            currency={displayCurrency} // Pass display currency
                                            apiKey={apiKey}
                                        />
                                    </ErrorBoundary>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
                            boxShadow: 'var(--shadow-sm)',
                            animation: 'fadeIn 0.5s ease-out'
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
                            <span style={{
                                fontWeight: 600,
                                color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-text-primary)'
                            }}>
                                {t.type === 'expense' || t.type === 'REAL_EXPENSE' ? '-' : '+'}
                                {formatCurrency(t.amount, t.currency)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
