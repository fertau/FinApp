import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Key, RefreshCw } from 'lucide-react';
import { GeminiService } from '../../services/GeminiService';

export default function FinPilotWidget({ transactions, apiKey }) {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (apiKey && transactions && transactions.length > 0) {
            fetchInsights();
        }
    }, [apiKey, transactions]);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await GeminiService.generateInsights(transactions, apiKey);
            setInsights(data);
        } catch (err) {
            console.error("Error fetching insights:", err);
            setError("No se pudieron generar insights. Verifica tu API Key.");
        } finally {
            setLoading(false);
        }
    };

    if (!apiKey) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', color: 'var(--color-text-secondary)' }}>
                <Key size={32} style={{ marginBottom: '1rem', color: 'var(--color-accent-primary)' }} />
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Requiere API Key</p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Configura tu llave de Gemini para recibir sugerencias inteligentes.</p>
                <button
                    onClick={() => document.querySelector('button[title="Settings"]')?.click() || alert("Ve a Configuración > Inteligencia Artificial")}
                    style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                    Ir a Configuración
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} style={{ color: 'var(--color-accent-primary)' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Sugerencias FinPilot</h4>
                </div>
                <button onClick={fetchInsights} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
                        Analizando gastos...
                    </div>
                ) : error ? (
                    <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                ) : insights.length > 0 ? (
                    insights.map((insight, i) => (
                        <div key={i} style={{
                            padding: '1rem',
                            backgroundColor: 'var(--color-bg-primary)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: `4px solid ${insight.type === 'warning' ? '#ef4444' : insight.type === 'success' ? '#10b981' : 'var(--color-accent-primary)'}`,
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                {insight.title}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                {insight.message}
                            </p>
                            {insight.proposal && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} />
                                    Propuesta: {insight.proposal}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                        No hay sugerencias por el momento.
                    </div>
                )}
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
