import { GoogleGenerativeAI } from "@google/generative-ai";

export const GeminiService = {
    async generateInsights(transactions, apiKey) {
        if (!apiKey) throw new Error("API Key is required");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Prepare context
        // Summarize transactions to avoid token limits if necessary, but for now send recent ones
        const recentTransactions = transactions.slice(0, 50).map(t =>
            `${t.date}: ${t.description} (${t.amount} ${t.currency}) - ${t.category}`
        ).join('\n');

        const prompt = `
            Analiza estas transacciones recientes y dame 3 insights breves y accionables para mejorar mis finanzas.
            Formato JSON: [{ "title": "...", "message": "...", "type": "warning|info|success", "proposal": "..." }]
            
            Transacciones:
            ${recentTransactions}
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    },

    async generateSavingsTips(transactions, anomalies, apiKey) {
        if (!apiKey) throw new Error("API Key is required");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Prepare anomalies context
        const anomaliesText = anomalies.map(a =>
            `${a.category}: ${a.type === 'increase' ? '+' : ''}${(a.percentageChange * 100).toFixed(0)}% (${a.currentTotal.toFixed(2)} vs promedio ${a.historicalAverage.toFixed(2)})`
        ).join('\n');

        // Prepare recent high-value transactions
        const highValueTxs = transactions
            .filter(t => Math.abs(t.amount) > 100)
            .slice(0, 10)
            .map(t => `${t.date}: ${t.description} - ${t.amount} ${t.currency} (${t.category})`)
            .join('\n');

        const prompt = `
Eres un asesor financiero personal. Analiza estos datos de gastos y genera 3 consejos ESPECÍFICOS y ACCIONABLES para ahorrar dinero.

ANOMALÍAS DETECTADAS:
${anomaliesText}

TRANSACCIONES GRANDES RECIENTES:
${highValueTxs}

INSTRUCCIONES:
1. Sé específico y práctico (no consejos genéricos como "gasta menos")
2. Menciona categorías y montos concretos
3. Prioriza las anomalías más grandes
4. Formato JSON: [{"tip": "...", "category": "...", "potentialSavings": number, "priority": "high|medium|low"}]

Responde SOLO con el JSON array, sin explicaciones adicionales.
        `.trim();

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
};
