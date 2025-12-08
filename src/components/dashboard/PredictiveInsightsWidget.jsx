import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Lightbulb, DollarSign, Calendar } from 'lucide-react';
import { PredictiveAnalyticsService } from '../../services/PredictiveAnalyticsService';
import { GeminiService } from '../../services/GeminiService';
import { formatCurrency } from '../../utils/currencyUtils';
import './PredictiveInsightsWidget.css';

export default function PredictiveInsightsWidget({ transactions, settings }) {
    const [projection, setProjection] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [savings, setSavings] = useState([]);
    const [aiTips, setAiTips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (!transactions || transactions.length === 0) {
            setLoading(false);
            return;
        }

        analyzeData();
    }, [transactions]);

    const analyzeData = () => {
        try {
            // 1. Project month-end expenses
            const projectionData = PredictiveAnalyticsService.projectMonthEndExpenses(transactions);
            setProjection(projectionData);

            // 2. Detect anomalies (compare last 3 months)
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

            const currentMonth = transactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate.getMonth() === now.getMonth() &&
                    txDate.getFullYear() === now.getFullYear();
            });

            const historical = transactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= threeMonthsAgo && txDate < new Date(now.getFullYear(), now.getMonth(), 1);
            });

            const anomaliesData = PredictiveAnalyticsService.detectAnomalies(
                currentMonth,
                historical,
                0.30 // 30% threshold
            );
            setAnomalies(anomaliesData.slice(0, 3)); // Top 3 anomalies

            // 3. Generate savings suggestions
            const savingsData = PredictiveAnalyticsService.generateSavingsSuggestions(
                currentMonth,
                [],
                0.20 // 20% target savings
            );
            setSavings(savingsData.slice(0, 3)); // Top 3 suggestions

            setLoading(false);
        } catch (error) {
            console.error('Error analyzing data:', error);
            setLoading(false);
        }
    };

    const generateAITips = async () => {
        if (!settings?.geminiApiKey) {
            alert('Por favor configura tu API Key de Gemini en Settings');
            return;
        }

        setLoadingAI(true);
        try {
            const tips = await GeminiService.generateSavingsTips(
                transactions,
                anomalies,
                settings.geminiApiKey
            );
            setAiTips(tips);
        } catch (error) {
            console.error('Error generating AI tips:', error);
            alert('Error al generar consejos con IA: ' + error.message);
        } finally {
            setLoadingAI(false);
        }
    };

    if (loading) {
        return (
            <div className="predictive-insights-widget loading">
                <div className="spinner"></div>
                <p>Analizando datos...</p>
            </div>
        );
    }

    if (!projection) {
        return (
            <div className="predictive-insights-widget empty">
                <p>No hay suficientes datos para generar proyecciones</p>
            </div>
        );
    }

    return (
        <div className="predictive-insights-widget">
            <div className="widget-header">
                <h3>📊 Análisis Predictivo</h3>
                <button
                    className="ai-tips-btn"
                    onClick={generateAITips}
                    disabled={loadingAI}
                >
                    {loadingAI ? '⏳ Generando...' : '🤖 Consejos IA'}
                </button>
            </div>

            {/* Projection Card */}
            <div className="insight-card projection-card">
                <div className="card-header">
                    <TrendingUp size={20} />
                    <h4>Proyección del Mes</h4>
                </div>
                <div className="card-content">
                    <div className="projection-stats">
                        <div className="stat">
                            <span className="label">Gastado hasta hoy</span>
                            <span className="value">{formatCurrency(projection.totalSpent, 'ARS')}</span>
                        </div>
                        <div className="stat">
                            <span className="label">Proyección fin de mes</span>
                            <span className="value projected">{formatCurrency(projection.projectedTotal, 'ARS')}</span>
                        </div>
                        <div className="stat">
                            <span className="label">Promedio diario</span>
                            <span className="value">{formatCurrency(projection.dailyAverage, 'ARS')}/día</span>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(projection.daysPassed / projection.totalDaysInMonth) * 100}%` }}
                        ></div>
                    </div>
                    <div className="progress-label">
                        <Calendar size={14} />
                        <span>Día {projection.daysPassed} de {projection.totalDaysInMonth}</span>
                        <span className="confidence">
                            Confianza: {Math.round(projection.confidence * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Anomalies Card */}
            {anomalies.length > 0 && (
                <div className="insight-card anomalies-card">
                    <div className="card-header">
                        <AlertTriangle size={20} />
                        <h4>Anomalías Detectadas</h4>
                    </div>
                    <div className="card-content">
                        {anomalies.map((anomaly, idx) => (
                            <div key={idx} className={`anomaly-item ${anomaly.type}`}>
                                <div className="anomaly-header">
                                    <span className="category">{anomaly.category}</span>
                                    <span className={`change ${anomaly.type}`}>
                                        {anomaly.type === 'increase' ? '↑' : '↓'}
                                        {Math.abs(anomaly.percentageChange * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="anomaly-details">
                                    <span>Actual: {formatCurrency(anomaly.currentTotal, 'ARS')}</span>
                                    <span className="vs">vs</span>
                                    <span>Promedio: {formatCurrency(anomaly.historicalAverage, 'ARS')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Savings Suggestions Card */}
            {savings.length > 0 && (
                <div className="insight-card savings-card">
                    <div className="card-header">
                        <Lightbulb size={20} />
                        <h4>Oportunidades de Ahorro</h4>
                    </div>
                    <div className="card-content">
                        {savings.map((suggestion, idx) => (
                            <div key={idx} className="savings-item">
                                <div className="savings-header">
                                    <span className="category">{suggestion.category}</span>
                                    <span className="savings-amount">
                                        <DollarSign size={14} />
                                        {formatCurrency(suggestion.potentialSavings, 'ARS')}
                                    </span>
                                </div>
                                <div className="savings-details">
                                    {suggestion.type === 'reduce_high_spending' && (
                                        <p>Reduciendo {Math.round(suggestion.targetReduction * 100)}% →
                                            Nuevo total: {formatCurrency(suggestion.newMonthlyTotal, 'ARS')}/mes
                                        </p>
                                    )}
                                    {suggestion.type === 'frequent_small_expenses' && (
                                        <p>{suggestion.transactionCount} transacciones pequeñas →
                                            Promedio: {formatCurrency(suggestion.averageAmount, 'ARS')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Tips Card */}
            {aiTips.length > 0 && (
                <div className="insight-card ai-tips-card">
                    <div className="card-header">
                        <span className="ai-badge">🤖</span>
                        <h4>Consejos Personalizados IA</h4>
                    </div>
                    <div className="card-content">
                        {aiTips.map((tip, idx) => (
                            <div key={idx} className={`ai-tip priority-${tip.priority}`}>
                                <div className="tip-header">
                                    <span className="tip-category">{tip.category}</span>
                                    {tip.potentialSavings && (
                                        <span className="tip-savings">
                                            Ahorro: {formatCurrency(tip.potentialSavings, 'ARS')}
                                        </span>
                                    )}
                                </div>
                                <p className="tip-text">{tip.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
