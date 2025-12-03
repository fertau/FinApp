import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ArrowLeft, ZoomIn } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300', '#a4de6c', '#EF4444', '#6366F1'];

const CustomTooltip = ({ active, payload, total }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0.0';
        return (
            <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '10px', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{data.name}</p>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    ${data.value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                    {percent}%
                </p>
                {!data.isLeaf && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                        Click para ver detalle
                    </p>
                )}
            </div>
        );
    }
    return null;
};

export default function CategoryChart({ transactions, exchangeRate, categories, subcategories }) {
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Helper to get parent category name for a transaction
    const getParentCategoryName = (t) => {
        const sub = subcategories?.find(s => s.name === t.category);
        if (sub) {
            const parent = categories?.find(c => c.id === sub.categoryId);
            if (parent) return parent.name;
        }
        const directParent = categories?.find(c => c.name === t.category);
        if (directParent) return directParent.name;
        return 'Otros';
    };

    const { data, total } = useMemo(() => {
        const totals = {};
        let totalAmount = 0;

        transactions.forEach(t => {
            if (t.type !== 'expense' && t.type !== 'REAL_EXPENSE') return;
            if (t.isExtraordinary) return;

            let amount = t.amount;
            if (t.currency === 'USD') amount *= exchangeRate;
            amount = Math.abs(amount);

            if (selectedCategory) {
                // Drill down
                const parentName = getParentCategoryName(t);
                if (parentName === selectedCategory) {
                    const subName = t.category;
                    if (!totals[subName]) totals[subName] = 0;
                    totals[subName] += amount;
                    totalAmount += amount;
                }
            } else {
                // Top Level
                const parentName = getParentCategoryName(t);
                if (!totals[parentName]) totals[parentName] = 0;
                totals[parentName] += amount;
                totalAmount += amount;
            }
        });

        const sortedData = Object.entries(totals)
            .map(([name, value]) => ({
                name,
                value,
                isLeaf: !!selectedCategory // If we are already drilled down, these are leaf nodes (subcategories)
            }))
            .sort((a, b) => b.value - a.value);

        return { data: sortedData, total: totalAmount };
    }, [transactions, exchangeRate, selectedCategory, categories, subcategories]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {selectedCategory && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(null);
                    }}
                    style={{
                        position: 'absolute',
                        top: -10, left: 0,
                        zIndex: 20,
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-bg-primary)',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        cursor: 'pointer',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.8rem',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    <ArrowLeft size={14} />
                    Volver a General
                </button>
            )}

            <h4 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: selectedCategory ? '20px' : '0' }}>
                {selectedCategory ? `Detalle: ${selectedCategory}` : 'Por Categoría Principal'}
            </h4>

            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={selectedCategory ? 110 : 100} // Slightly larger when zoomed
                        innerRadius={selectedCategory ? 60 : 0} // Donut chart when zoomed for variety? Or keep pie. Let's keep pie but maybe inner radius 0.
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(entry) => {
                            if (!selectedCategory) {
                                setSelectedCategory(entry.name);
                            }
                        }}
                        cursor={!selectedCategory ? 'pointer' : 'default'}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                style={{ outline: 'none' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip total={total} />} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px', maxWidth: '120px' }}
                        formatter={(value, entry) => {
                            const item = data.find(d => d.name === value);
                            const percent = item ? ((item.value / total) * 100).toFixed(0) : 0;
                            return `${value} (${percent}%)`;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {!selectedCategory && data.length > 0 && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ZoomIn size={12} /> Click en una categoría para ver detalle
                </div>
            )}
        </div>
    );
}
