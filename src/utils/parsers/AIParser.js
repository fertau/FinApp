import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIParser {
    constructor(text, apiKey, cardMappings = []) {
        this.text = text;
        this.apiKey = apiKey;
        this.cardMappings = cardMappings;
    }

    async parse() {
        if (!this.apiKey) {
            throw new Error("API Key de Gemini no configurada. Ve a Configuración.");
        }

        if (!this.text || this.text.length < 10) {
            throw new Error("El archivo parece estar vacío o es una imagen escaneada sin texto seleccionable. Intenta copiar y pegar el texto manualmente o usar un PDF con texto digital.");
        }

        const genAI = new GoogleGenerativeAI(this.apiKey);

        const prompt = `
            Act as a financial data parser. I will provide the text content of a credit card statement or bank statement.
            Your task is to extract all transactions and return them in a strict JSON format.

            Input Text:
            """
            ${this.text.substring(0, 30000).replace(/`/g, "'")} 
            """
            (Note: Text truncated to 30k chars to fit context if too long, but usually fits)

            Instructions:
            1. **Owner Detection**: 
               - Look for headers like "Total Consumos de [NAME]".
               - **CRITICAL**: Look for footers like "TOTAL ADICIONAL DE [NAME]". This indicates that the *preceding* list of transactions belongs to that person.
               - If a block of transactions has no specific owner indication, assign it to "Titular" or the main account holder.
            2. **Date Format**:
               - Standard: DD/MM/YYYY
               - Textual: DD-MMM-YY (e.g., "09-Oct-25", "01-Nov-25"). Convert these to DD/MM/YYYY.
            3. **Extract Transactions**:
               - **Installments (CRITICAL)**: Scan the **ENTIRE RAW LINE** for the pattern "XX/XX" (two digits, slash, two digits). 
                 - It might be in a separate column, separated by spaces from the description.
                 - Example: "MERPAGO*RAPSODIA      02/06      04982" -> installment: 2, totalInstallments: 6.
                 - ALWAYS extract these numbers if present anywhere in the line.
               - Description: The text of the transaction (e.g., "MERPAGO*RAPSODIA"). Do NOT include the installment numbers in the final description if possible, but it's okay if they remain.
               - Amount: Negative for expenses, Positive for payments/credits.
               - Currency: Detect ARS or USD columns.
            4. **Logic**:
               - **Owner Rule 1 (Adicionales)**: If you see a footer "TOTAL ADICIONAL DE [NAME]", all transactions ABOVE it (up to the previous subtotal) belong to [NAME].
               - **Owner Rule 2 (Titular)**: Any transaction block that is NOT followed by a "TOTAL ADICIONAL" footer belongs to "Fernando" (the main holder).
               - **Default**: If you cannot determine the owner, default to "Fernando".
               - Ignore "SUBTOTAL", "SALDO ANTERIOR", "SU PAGO", "TASAS".
            5. Return ONLY the JSON array.
            6. **Statement Date**: Try to find the "Vencimiento" or "Cierre" date of the statement. If found, include it as a separate field "statementDate" in the first transaction object (or all), or better yet, I will ask you to return an object.

            Output Format:
            {
                "statementDate": "DD/MM/YYYY",
                "transactions": [
                    {
                        "date": "09/10/2025",
                        "description": "MERPAGO*RAPSODIA",
                        "amount": -40000.00,
                        "currency": "ARS",
                        "owner": "Jesica",
                        "type": "expense",
                        "installment": 2,
                        "totalInstallments": 6
                    }
                ]
            }
        `;

        // Try multiple models including new and legacy ones
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-2.5-flash",
            "gemini-2.5-flash-latest",
            "gemini-2.5-flash-001",
            "gemini-2.5-flash-8b",
            "gemini-2.5-flash",
            "gemini-1.0-pro",
            "gemini-2.5-flash"
        ];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying AI model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                // Use explicit content structure to avoid 400 errors
                const result = await model.generateContent({
                    contents: [{
                        role: 'user',
                        parts: [{ text: prompt }]
                    }]
                });
                const response = await result.response;
                let text = response.text();

                // Clean up potential markdown code blocks
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();

                const parsed = JSON.parse(text);
                // Handle both array (legacy) and object (new) formats
                let transactions = [];
                let statementDate = null;

                if (Array.isArray(parsed)) {
                    transactions = parsed;
                } else {
                    transactions = parsed.transactions || [];
                    statementDate = parsed.statementDate;
                }

                // Post-process to ensure consistency
                return transactions.map(t => {
                    let finalDate = t.date;

                    // Adjust Installment Date logic
                    if ((t.installment || t.isInstallment) && statementDate) {
                        try {
                            // Parse statement date (DD/MM/YYYY)
                            const [sDay, sMonth, sYear] = statementDate.split('/');
                            // Parse transaction date (DD/MM/YYYY)
                            const [tDay] = t.date.split('/'); // Keep original day

                            // Construct new date: Original Day + Statement Month/Year
                            // Note: Statement date usually is the month AFTER the consumption for credit cards, 
                            // or the same month. The user wants "within the month contemplated in the summary".
                            // Usually the summary month is the month of "Cierre" or "Vencimiento".
                            // Let's use the Statement Month/Year.
                            finalDate = `${tDay}/${sMonth}/${sYear}`;
                        } catch (e) {
                            console.warn("Error adjusting installment date:", e);
                        }
                    }

                    return {
                        ...t,
                        date: finalDate,
                        id: Math.random().toString(36).substr(2, 9), // Temp ID
                        originalLine: t.description, // AI doesn't give original line, use desc
                        paymentMethod: 'Tarjeta Crédito', // Default
                        bank: 'Desconocido', // AI could extract this too, but let's keep it simple
                        cardBrand: 'Desconocido'
                    };
                });

            } catch (error) {
                console.warn(`Failed with model ${modelName}:`, error);
                lastError = error;
                // Continue to next model
            }
        }

        console.error("All AI models failed.");
        throw new Error("Error al analizar con IA (todos los modelos fallaron). Verifica tu API Key. Detalles: " + lastError.message);
    }
}
