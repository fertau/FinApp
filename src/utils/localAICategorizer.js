import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

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
    const model = await loadModel();

    // Filter uncategorized
    const uncategorized = transactions.filter(t => !t.category || t.category === 'Uncategorized');
    if (uncategorized.length === 0) return transactions;

    const categoryNames = categories.map(c => c.name);
    const descriptions = uncategorized.map(t => t.description.toLowerCase());

    // Embed categories
    const categoryEmbeddings = await model.embed(categoryNames);

    // Embed descriptions (batching might be needed for large sets, but USE handles reasonable batches)
    const descriptionEmbeddings = await model.embed(descriptions);

    // Calculate similarity
    // We need to do matrix multiplication: descriptions x categories^T
    const scores = tf.matMul(descriptionEmbeddings, categoryEmbeddings, false, true);

    // Get best matches
    const bestMatchIndices = await tf.argMax(scores, 1).data();
    const maxScores = await tf.max(scores, 1).data();

    // Cleanup tensors
    categoryEmbeddings.dispose();
    descriptionEmbeddings.dispose();
    scores.dispose();

    // Apply categories
    let updatedTransactions = [...transactions];

    uncategorized.forEach((t, i) => {
        const bestIndex = bestMatchIndices[i];
        const score = maxScores[i];

        // Threshold for confidence (e.g., 0.5)
        if (score > 0.3) {
            const predictedCategory = categoryNames[bestIndex];

            // Find the original transaction index
            const originalIndex = updatedTransactions.findIndex(ut => ut === t);
            if (originalIndex !== -1) {
                updatedTransactions[originalIndex] = {
                    ...updatedTransactions[originalIndex],
                    category: predictedCategory
                };
            }
        }
    });

    return updatedTransactions;
}
