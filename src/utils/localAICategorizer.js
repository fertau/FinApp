import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { db } from '../db';

let model = null;

export async function loadModel() {
    if (!model) {
        console.log("Loading TensorFlow USE model...");
        model = await use.load();
        console.log("Model loaded.");
    }
    return model;
}

export async function categorizeWithLocalAI(transactions, categories) {
    // 1. Try to learn from past transactions first (Exact Match)
    const uncategorized = transactions.filter(t => !t.category || t.category === 'Uncategorized');
    if (uncategorized.length === 0) return transactions;

    let updatedTransactions = [...transactions];
    const remainingUncategorizedIndices = [];

    // Fetch all past transactions to build a lookup map
    // Optimization: In a real app with millions of rows, we'd query specific descriptions.
    // For local indexedDB with <10k rows, fetching all descriptions/categories is okay-ish, 
    // but better to query individually or use a dedicated 'rules' table.
    // Let's try to find matches for each uncategorized transaction.

    for (let i = 0; i < uncategorized.length; i++) {
        const t = uncategorized[i];
        const originalIndex = updatedTransactions.findIndex(ut => ut === t);

        // Look for the most recent transaction with the same description
        const pastMatch = await db.transactions
            .where('description').equals(t.description)
            .and(pt => !!pt.category && pt.category !== 'Uncategorized')
            .last();

        if (pastMatch) {
            updatedTransactions[originalIndex] = {
                ...updatedTransactions[originalIndex],
                category: pastMatch.category
            };
        } else {
            remainingUncategorizedIndices.push(originalIndex);
        }
    }

    // 2. Use TensorFlow for remaining items
    if (remainingUncategorizedIndices.length > 0) {
        const model = await loadModel();
        const categoryNames = categories.map(c => c.name);

        // Only embed the remaining uncategorized descriptions
        const descriptionsToPredict = remainingUncategorizedIndices.map(idx => updatedTransactions[idx].description.toLowerCase());

        if (descriptionsToPredict.length > 0) {
            // Embed categories
            const categoryEmbeddings = await model.embed(categoryNames);
            const descriptionEmbeddings = await model.embed(descriptionsToPredict);

            // Calculate similarity
            const scores = tf.matMul(descriptionEmbeddings, categoryEmbeddings, false, true);

            // Get best matches
            const bestMatchIndices = await tf.argMax(scores, 1).data();
            const maxScores = await tf.max(scores, 1).data();

            // Cleanup
            categoryEmbeddings.dispose();
            descriptionEmbeddings.dispose();
            scores.dispose();

            // Apply predictions
            remainingUncategorizedIndices.forEach((originalIdx, i) => {
                const bestIndex = bestMatchIndices[i];
                const score = maxScores[i];

                if (score > 0.3) {
                    updatedTransactions[originalIdx] = {
                        ...updatedTransactions[originalIdx],
                        category: categoryNames[bestIndex]
                    };
                }
            });
        }
    }

    return updatedTransactions;
}
