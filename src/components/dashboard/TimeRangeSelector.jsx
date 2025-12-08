import React from 'react';

export const TIME_RANGES = [
    { label: 'ESTE MES', value: 'THIS_MONTH' },
    { label: 'MES PASADO', value: 'LAST_MONTH' },
    { label: 'MENSUAL', value: 'CUSTOM_MONTH' },
    { label: '3M', value: '3M', days: 90 },
    { label: '6M', value: '6M', days: 180 },
    { label: 'YTD', value: 'YTD' },
    { label: '1 AÑO', value: '1Y', days: 365 },
    { label: 'TODO', value: 'ALL' }
];

export default function TimeRangeSelector({ selectedRange, onRangeChange }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            border: '1px solid var(--color-bg-tertiary)',
            overflowX: 'auto', // Allow scrolling on small screens
            maxWidth: '100%'
        }}>
            {TIME_RANGES.map(range => {
                const isSelected = selectedRange === range.value;
                return (
                    <button
                        key={range.value}
                        onClick={() => onRangeChange(range.value)}
                        style={{
                            background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                            color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {range.label}
                    </button>
                );
            })}
        </div>
    );
}
