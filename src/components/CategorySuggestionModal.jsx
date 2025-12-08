import React, { useState, useEffect } from 'react';
import { db } from '../db';
import './CategorySuggestionModal.css';

export default function CategorySuggestionModal({
    transaction,
    suggestion,
    onApply,
    onSkip,
    onClose
}) {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newSubcategoryName, setNewSubcategoryName] = useState('');

    useEffect(() => {
        loadCategories();

        // Pre-fill with suggestion if available
        if (suggestion) {
            setSelectedCategory(suggestion.category || '');
            setSelectedSubcategory(suggestion.subcategory || '');
        }
    }, [suggestion]);

    useEffect(() => {
        if (selectedCategory) {
            loadSubcategories(selectedCategory);
        }
    }, [selectedCategory]);

    const loadCategories = async () => {
        const cats = await db.categories.toArray();
        setCategories(cats);
    };

    const loadSubcategories = async (categoryName) => {
        const category = categories.find(c => c.name === categoryName);
        if (!category) return;

        const subs = await db.subcategories
            .where('categoryId')
            .equals(category.id)
            .toArray();
        setSubcategories(subs);
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const categoryId = await db.categories.add({
                name: newCategoryName,
                type: 'expense',
                color: getRandomColor()
            });

            await loadCategories();
            setSelectedCategory(newCategoryName);
            setNewCategoryName('');
            setIsCreatingCategory(false);
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Error al crear la categoría');
        }
    };

    const handleCreateSubcategory = async () => {
        if (!newSubcategoryName.trim() || !selectedCategory) return;

        try {
            const category = categories.find(c => c.name === selectedCategory);
            if (!category) return;

            await db.subcategories.add({
                name: newSubcategoryName,
                categoryId: category.id
            });

            await loadSubcategories(selectedCategory);
            setSelectedSubcategory(newSubcategoryName);
            setNewSubcategoryName('');
            setIsCreatingSubcategory(false);
        } catch (error) {
            console.error('Error creating subcategory:', error);
            alert('Error al crear la subcategoría');
        }
    };

    const handleApply = () => {
        if (!selectedCategory) {
            alert('Por favor selecciona una categoría');
            return;
        }

        onApply({
            category: selectedCategory,
            subcategory: selectedSubcategory || 'Otros'
        });
    };

    const getRandomColor = () => {
        const colors = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return '#10B981'; // green
        if (confidence >= 0.6) return '#F59E0B'; // yellow
        return '#EF4444'; // red
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Sugerencia de Categoría</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Transaction Info */}
                    <div className="transaction-info">
                        <div className="info-row">
                            <span className="label">Descripción:</span>
                            <span className="value">{transaction.description}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Monto:</span>
                            <span className="value">{transaction.amount} {transaction.currency}</span>
                        </div>
                    </div>

                    {/* AI Suggestion */}
                    {suggestion && (
                        <div className="ai-suggestion">
                            <div className="suggestion-header">
                                <span className="ai-badge">🤖 Sugerencia IA</span>
                                <span
                                    className="confidence-badge"
                                    style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                                >
                                    {Math.round(suggestion.confidence * 100)}% confianza
                                </span>
                            </div>
                            <div className="suggestion-content">
                                <strong>{suggestion.category}</strong>
                                {suggestion.subcategory && ` → ${suggestion.subcategory}`}
                            </div>
                            {suggestion.reasoning && (
                                <div className="suggestion-reasoning">
                                    {suggestion.reasoning}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Category Selection */}
                    <div className="category-selection">
                        <div className="form-group">
                            <label>Categoría</label>
                            {!isCreatingCategory ? (
                                <div className="select-with-action">
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn-link"
                                        onClick={() => setIsCreatingCategory(true)}
                                    >
                                        + Nueva
                                    </button>
                                </div>
                            ) : (
                                <div className="create-input">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Nombre de la categoría..."
                                        autoFocus
                                    />
                                    <button className="btn-sm" onClick={handleCreateCategory}>
                                        Crear
                                    </button>
                                    <button
                                        className="btn-sm btn-cancel"
                                        onClick={() => {
                                            setIsCreatingCategory(false);
                                            setNewCategoryName('');
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedCategory && (
                            <div className="form-group">
                                <label>Subcategoría</label>
                                {!isCreatingSubcategory ? (
                                    <div className="select-with-action">
                                        <select
                                            value={selectedSubcategory}
                                            onChange={(e) => setSelectedSubcategory(e.target.value)}
                                        >
                                            <option value="">Otros</option>
                                            {subcategories.map(sub => (
                                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn-link"
                                            onClick={() => setIsCreatingSubcategory(true)}
                                        >
                                            + Nueva
                                        </button>
                                    </div>
                                ) : (
                                    <div className="create-input">
                                        <input
                                            type="text"
                                            value={newSubcategoryName}
                                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                                            placeholder="Nombre de la subcategoría..."
                                            autoFocus
                                        />
                                        <button className="btn-sm" onClick={handleCreateSubcategory}>
                                            Crear
                                        </button>
                                        <button
                                            className="btn-sm btn-cancel"
                                            onClick={() => {
                                                setIsCreatingSubcategory(false);
                                                setNewSubcategoryName('');
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onSkip}>
                        Omitir
                    </button>
                    <button className="btn-primary" onClick={handleApply}>
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
