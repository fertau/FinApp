import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthNavigator({ currentDate, onMonthChange }) {
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        onMonthChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        onMonthChange(newDate);
    };

    const formattedMonth = currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
    // Capitalize first letter
    const displayMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '2px'
        }}>
            <button
                onClick={handlePrev}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px', color: 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center'
                }}
                title="Mes Anterior"
            >
                <ChevronLeft size={18} />
            </button>

            <span style={{
                padding: '0 12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--color-text-primary)',
                minWidth: '140px',
                textAlign: 'center'
            }}>
                {displayMonth}
            </span>

            <button
                onClick={handleNext}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px', color: 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center'
                }}
                title="Mes Siguiente"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
