import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function FinPilotChat({ transactions }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Hola, soy FinPilot. ¿En qué puedo ayudarte hoy con tus finanzas?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const responseText = await generateResponse(input, transactions);
            const aiMsg = { id: Date.now() + 1, sender: 'ai', text: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Gemini Error:", error);
            const errorMsg = { id: Date.now() + 1, sender: 'ai', text: "Lo siento, tuve un problema al conectar con mi cerebro digital. Por favor verifica tu API Key en Configuración." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const generateResponse = async (query, data) => {
        // 1. Check for API Key
        const settings = JSON.parse(localStorage.getItem('financeSettings') || '{}');
        let apiKey = settings.geminiApiKey;

        // Fallback to shared env key
        if (!apiKey && import.meta.env.VITE_GEMINI_API_KEY) {
            apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            console.log("Using shared API Key");
        }

        if (!apiKey) {
            return "Necesito una API Key de Google Gemini para funcionar. Por favor agrégala en la sección de Configuración.";
        }

        // 2. Local Logic (Fast Path)
        const q = query.toLowerCase();
        if (q.includes('recurrentes') || q.includes('suscripciones')) {
            // We can still use local logic for specific things if we want, or just let Gemini handle it all.
            // Let's let Gemini handle it but give it good context.
        }

        // 3. Prepare Context
        // Summarize data to avoid token limits
        const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        // Top Categories
        const catTotals = {};
        data.filter(t => t.type === 'expense').forEach(t => {
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });
        const topCategories = Object.entries(catTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => `${name}: $${amount.toFixed(0)}`)
            .join(', ');

        // Recent Transactions (Last 10)
        const recent = data.slice(0, 10).map(t =>
            `${t.date} - ${t.description} - $${t.amount} (${t.category})`
        ).join('\n');

        const systemPrompt = `
            Actúa como FinPilot, un experto asistente financiero personal.
            
            Resumen Financiero del Usuario:
            - Total Ingresos: $${totalIncome.toFixed(2)}
            - Total Gastos: $${totalExpense.toFixed(2)}
            - Balance: $${(totalIncome - totalExpense).toFixed(2)}
            - Top 5 Categorías de Gasto: ${topCategories}
            
            Últimas 10 transacciones:
            ${recent}
            
            Instrucciones:
            - Responde de manera concisa, amable y profesional.
            - Usa emojis para dar vida a la respuesta.
            - Si te preguntan por algo que no está en el resumen (ej. gastos de hace un año), explica que solo tienes acceso a los datos recientes y resumidos por ahora.
            - Si detectas gastos recurrentes en la lista reciente, menciónalos.
            - Tu objetivo es ayudar al usuario a entender sus finanzas.
        `;

        // 4. Call Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent([systemPrompt, query]);
        const response = await result.response;
        return response.text();
    };

    const SUGGESTIONS = [
        "💰 ¿Cuánto gasté este mes?",
        "🔄 Listar gastos recurrentes",
        "📈 ¿Cuál fue mi mayor gasto?",
        "💳 Gastos por tarjeta"
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 150px)', // Adjust based on layout
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-bg-tertiary)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'var(--color-bg-secondary)'
            }}>
                <div style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-accent-primary)',
                    color: 'white'
                }}>
                    <Bot size={24} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>FinPilot AI</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Tu asistente financiero personal</p>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        gap: '0.75rem'
                    }}>
                        {msg.sender === 'ai' && (
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-accent-subtle)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-accent-primary)',
                                flexShrink: 0
                            }}>
                                <Bot size={18} />
                            </div>
                        )}

                        <div style={{
                            maxWidth: '70%',
                            padding: '1rem',
                            borderRadius: '1rem',
                            backgroundColor: msg.sender === 'user' ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                            color: msg.sender === 'user' ? 'white' : 'var(--color-text-primary)',
                            borderTopLeftRadius: msg.sender === 'ai' ? '0' : '1rem',
                            borderTopRightRadius: msg.sender === 'user' ? '0' : '1rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            {msg.text}
                        </div>

                        {msg.sender === 'user' && (
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-text-secondary)',
                                flexShrink: 0
                            }}>
                                <User size={18} />
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-accent-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-accent-primary)'
                        }}>
                            <Bot size={18} />
                        </div>
                        <div style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderTopLeftRadius: '0',
                            color: 'var(--color-text-secondary)',
                            fontStyle: 'italic'
                        }}>
                            Escribiendo...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '1.5rem',
                borderTop: '1px solid var(--color-bg-tertiary)',
                backgroundColor: 'var(--color-bg-secondary)'
            }}>
                {/* Suggestions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {SUGGESTIONS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => { setInput(s.replace(/^[^\w\s]+ /, '')); }} // Remove emoji for input
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                border: '1px solid var(--color-accent-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--color-accent-primary)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-subtle)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Pregúntame algo sobre tus gastos..."
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-bg-tertiary)',
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            fontSize: '1rem'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        style={{
                            padding: '0 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: input.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                            color: 'white',
                            border: 'none',
                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
