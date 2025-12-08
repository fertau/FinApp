import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../db';

export const CategorizationService = {
    /**
     * Auto-categorize a batch of transactions using Gemini AI
     * @param {Array} transactions - Array of transaction objects
     * @param {Array} rules - User-defined categorization rules
     * @param {string} apiKey - Gemini API key
     * @returns {Promise<Array>} - Transactions with suggested categories
     */
    async autoCategorizeBatch(transactions, rules = [], apiKey) {
        if (!apiKey) throw new Error("API Key is required for auto-categorization");
        if (!transactions || transactions.length === 0) return [];

        // First, apply user-defined rules
        const transactionsWithRules = transactions.map(t => {
            const ruleMatch = this.applyRules(t, rules);
            if (ruleMatch) {
                return { ...t, ...ruleMatch, source: 'rule' };
            }
            return t;
        });

        // Filter transactions that still need AI categorization
        const needsAI = transactionsWithRules.filter(t => !t.category || !t.subcategory);

        if (needsAI.length === 0) {
            return transactionsWithRules;
        }

        // Get existing categories and subcategories for context
        const categories = await db.categories.toArray();
        const subcategories = await db.subcategories.toArray();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Prepare context with existing categories
        const categoryContext = categories.map(c => {
            const subs = subcategories.filter(s => s.categoryId === c.id);
            return `${c.name}: [${subs.map(s => s.name).join(', ')}]`;
        }).join('\n');

        // Process in batches of 20 to avoid token limits
        const batchSize = 20;
        const aiResults = [];

        for (let i = 0; i < needsAI.length; i += batchSize) {
            const batch = needsAI.slice(i, i + batchSize);

            const transactionList = batch.map((t, idx) =>
                `${idx}: "${t.description}" - ${t.amount} ${t.currency}`
            ).join('\n');

            const prompt = `
Eres un asistente de categorización financiera. Analiza estas transacciones y asigna categoría y subcategoría.

CATEGORÍAS EXISTENTES:
${categoryContext}

TRANSACCIONES:
${transactionList}

INSTRUCCIONES:
1. Usa SOLO las categorías y subcategorías existentes listadas arriba
2. Si no hay subcategoría apropiada, usa "Otros"
3. Sé preciso basándote en la descripción
4. Responde en formato JSON array: [{"index": 0, "category": "...", "subcategory": "...", "confidence": 0.95}]
5. confidence debe ser un número entre 0 y 1

Responde SOLO con el JSON array, sin explicaciones adicionales.
            `.trim();

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean markdown code blocks if present
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const suggestions = JSON.parse(jsonStr);

                // Map suggestions back to transactions
                suggestions.forEach(suggestion => {
                    if (suggestion.index !== undefined && batch[suggestion.index]) {
                        aiResults.push({
                            ...batch[suggestion.index],
                            category: suggestion.category,
                            subcategory: suggestion.subcategory,
                            confidence: suggestion.confidence || 0.8,
                            source: 'ai'
                        });
                    }
                });
            } catch (error) {
                console.error("Gemini API Error in batch:", error);
                // Add transactions without categorization on error
                batch.forEach(t => aiResults.push({ ...t, source: 'error' }));
            }
        }

        // Merge results: keep rule-based categorizations and add AI results
        const finalResults = transactionsWithRules.map(t => {
            if (t.source === 'rule') return t;
            const aiResult = aiResults.find(ai => ai.id === t.id || ai.description === t.description);
            return aiResult || t;
        });

        return finalResults;
    },

    /**
     * Suggest category for a single transaction
     * @param {string} description - Transaction description
     * @param {number} amount - Transaction amount
     * @param {Array} existingCategories - Available categories
     * @param {string} apiKey - Gemini API key
     * @returns {Promise<Object>} - Suggested category with confidence
     */
    async suggestCategory(description, amount, existingCategories = [], apiKey) {
        if (!apiKey) throw new Error("API Key is required");
        if (!description) return null;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const categoryList = existingCategories.map(c => {
            const subs = c.subcategories || [];
            return `${c.name}: [${subs.join(', ')}]`;
        }).join('\n');

        const prompt = `
Analiza esta transacción y sugiere la categoría y subcategoría más apropiada.

CATEGORÍAS DISPONIBLES:
${categoryList}

TRANSACCIÓN:
Descripción: "${description}"
Monto: ${amount}

Responde en formato JSON: {"category": "...", "subcategory": "...", "confidence": 0.95, "reasoning": "breve explicación"}

Usa SOLO las categorías listadas arriba. Si no hay subcategoría apropiada, usa "Otros".
        `.trim();

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Gemini API Error:", error);
            return null;
        }
    },

    /**
     * Apply user-defined categorization rules to a transaction
     * @param {Object} transaction - Transaction object
     * @param {Array} rules - Array of categorization rules
     * @returns {Object|null} - Matched category/subcategory or null
     */
    applyRules(transaction, rules) {
        if (!rules || rules.length === 0) return null;

        // Filter only enabled rules
        const activeRules = rules.filter(r => r.enabled !== false);

        for (const rule of activeRules) {
            const { condition, action } = rule;

            if (!condition || !action) continue;

            // Evaluate condition
            const matches = this.evaluateCondition(transaction, condition);

            if (matches) {
                return {
                    category: action.category,
                    subcategory: action.subcategory || 'Otros'
                };
            }
        }

        return null;
    },

    /**
     * Evaluate a single condition against a transaction
     * @param {Object} transaction - Transaction object
     * @param {Object} condition - Condition object {field, operator, value}
     * @returns {boolean} - Whether condition matches
     */
    evaluateCondition(transaction, condition) {
        const { field, operator, value } = condition;
        const fieldValue = transaction[field];

        if (fieldValue === undefined) return false;

        switch (operator) {
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

            case 'equals':
                return String(fieldValue).toLowerCase() === String(value).toLowerCase();

            case 'startsWith':
                return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

            case 'endsWith':
                return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());

            case 'greaterThan':
                return Number(fieldValue) > Number(value);

            case 'lessThan':
                return Number(fieldValue) < Number(value);

            case 'regex':
                try {
                    const regex = new RegExp(value, 'i');
                    return regex.test(String(fieldValue));
                } catch (e) {
                    console.error("Invalid regex:", value);
                    return false;
                }

            default:
                return false;
        }
    },

    /**
     * Get all categorization rules for current user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Array of rules
     */
    async getRules(userId) {
        if (!db.categorizationRules) {
            console.warn("categorizationRules store not available yet");
            return [];
        }

        try {
            const rules = await db.categorizationRules
                .where('userId')
                .equals(userId)
                .toArray();
            return rules;
        } catch (error) {
            console.error("Error fetching rules:", error);
            return [];
        }
    },

    /**
     * Save a new categorization rule
     * @param {Object} rule - Rule object
     * @returns {Promise<number>} - Rule ID
     */
    async saveRule(rule) {
        if (!db.categorizationRules) {
            throw new Error("categorizationRules store not available");
        }

        const ruleData = {
            ...rule,
            createdAt: new Date().toISOString(),
            enabled: rule.enabled !== false
        };

        return await db.categorizationRules.add(ruleData);
    },

    /**
     * Update an existing rule
     * @param {number} ruleId - Rule ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<number>} - Number of updated records
     */
    async updateRule(ruleId, updates) {
        if (!db.categorizationRules) {
            throw new Error("categorizationRules store not available");
        }

        return await db.categorizationRules.update(ruleId, updates);
    },

    /**
     * Delete a rule
     * @param {number} ruleId - Rule ID
     * @returns {Promise<void>}
     */
    async deleteRule(ruleId) {
        if (!db.categorizationRules) {
            throw new Error("categorizationRules store not available");
        }

        return await db.categorizationRules.delete(ruleId);
    }
};
