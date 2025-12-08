
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function categorizeWithAI(transactions, categories, apiKey) {
    if (!apiKey) {
        throw new Error("API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Filter only uncategorized transactions to save tokens
    const uncategorized = transactions.filter(t => !t.category || t.category === 'Uncategorized');

    if (uncategorized.length === 0) return transactions;

    // Prepare prompt
    const categoryList = categories.map(c => c.name).join(", ");
    const descriptions = uncategorized.map((t, i) => `${i}: ${t.description} (${t.amount})`).join("\n");

    const prompt = `
    You are a financial assistant. I have a list of transaction descriptions. 
    Please categorize them into one of the following categories: [${categoryList}].
    If none fit perfectly, choose the closest one or "Varios".
    
    Return ONLY a JSON object where keys are the indices provided and values are the category names.
    Example format: { "0": "Food", "1": "Transport" }

    Transactions:
    ${descriptions}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const predictions = JSON.parse(jsonString);

        // Apply predictions
        return transactions.map((t, i) => {
            // Find if this transaction was in the uncategorized list
            const indexInUncategorized = uncategorized.findIndex(u => u === t);
            if (indexInUncategorized !== -1 && predictions[indexInUncategorized]) {
                return { ...t, category: predictions[indexInUncategorized] };
            }
            return t;
        });

    } catch (error) {
        console.error("AI Categorization Error:", error);
        throw error;
    }
}
