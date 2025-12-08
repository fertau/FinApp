import React, { useState, useEffect } from 'react';
import { CategorizationService } from '../services/CategorizationService';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import './CategorizationRulesManager.css';

export default function CategorizationRulesManager() {
    const { user } = useAuth();
    const [rules, setRules] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [isAddingRule, setIsAddingRule] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        field: 'description',
        operator: 'contains',
        value: '',
        category: '',
        subcategory: ''
    });

    useEffect(() => {
        loadRules();
        loadCategories();
    }, [user]);

    const loadRules = async () => {
        if (!user) return;
        const userRules = await CategorizationService.getRules(user.uid);
        setRules(userRules);
    };

    const loadCategories = async () => {
        const cats = await db.categories.toArray();
        setCategories(cats);
        const subs = await db.subcategories.toArray();
        setSubcategories(subs);
    };

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (categoryName) => {
        setFormData(prev => ({ ...prev, category: categoryName, subcategory: '' }));
    };

    const getSubcategoriesForCategory = (categoryName) => {
        const category = categories.find(c => c.name === categoryName);
        if (!category) return [];
        return subcategories.filter(s => s.categoryId === category.id);
    };

    const handleSaveRule = async () => {
        if (!formData.value || !formData.category) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        const ruleData = {
            userId: user.uid,
            condition: {
                field: formData.field,
                operator: formData.operator,
                value: formData.value
            },
            action: {
                category: formData.category,
                subcategory: formData.subcategory || 'Otros'
            },
            enabled: true
        };

        try {
            if (editingRule) {
                await CategorizationService.updateRule(editingRule.id, ruleData);
            } else {
                await CategorizationService.saveRule(ruleData);
            }

            // Reset form
            setFormData({
                field: 'description',
                operator: 'contains',
                value: '',
                category: '',
                subcategory: ''
            });
            setIsAddingRule(false);
            setEditingRule(null);
            loadRules();
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Error al guardar la regla');
        }
    };

    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setFormData({
            field: rule.condition.field,
            operator: rule.condition.operator,
            value: rule.condition.value,
            category: rule.action.category,
            subcategory: rule.action.subcategory
        });
        setIsAddingRule(true);
    };

    const handleDeleteRule = async (ruleId) => {
        if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

        try {
            await CategorizationService.deleteRule(ruleId);
            loadRules();
        } catch (error) {
            console.error('Error deleting rule:', error);
            alert('Error al eliminar la regla');
        }
    };

    const handleToggleRule = async (rule) => {
        try {
            await CategorizationService.updateRule(rule.id, { enabled: !rule.enabled });
            loadRules();
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    };

    const handleCancelEdit = () => {
        setIsAddingRule(false);
        setEditingRule(null);
        setFormData({
            field: 'description',
            operator: 'contains',
            value: '',
            category: '',
            subcategory: ''
        });
    };

    const getOperatorLabel = (operator) => {
        const labels = {
            contains: 'contiene',
            equals: 'es igual a',
            startsWith: 'comienza con',
            endsWith: 'termina con',
            greaterThan: 'mayor que',
            lessThan: 'menor que',
            regex: 'coincide con regex'
        };
        return labels[operator] || operator;
    };

    return (
        <div className="categorization-rules-manager">
            <div className="rules-header">
                <h2>Reglas de Categorización</h2>
                <button
                    className="btn-primary"
                    onClick={() => setIsAddingRule(true)}
                    disabled={isAddingRule}
                >
                    + Nueva Regla
                </button>
            </div>

            {isAddingRule && (
                <div className="rule-form">
                    <h3>{editingRule ? 'Editar Regla' : 'Nueva Regla'}</h3>

                    <div className="form-section">
                        <h4>Condición</h4>
                        <div className="form-row">
                            <select
                                value={formData.field}
                                onChange={(e) => handleFieldChange('field', e.target.value)}
                            >
                                <option value="description">Descripción</option>
                                <option value="amount">Monto</option>
                                <option value="owner">Dueño</option>
                            </select>

                            <select
                                value={formData.operator}
                                onChange={(e) => handleFieldChange('operator', e.target.value)}
                            >
                                <option value="contains">contiene</option>
                                <option value="equals">es igual a</option>
                                <option value="startsWith">comienza con</option>
                                <option value="endsWith">termina con</option>
                                {formData.field === 'amount' && (
                                    <>
                                        <option value="greaterThan">mayor que</option>
                                        <option value="lessThan">menor que</option>
                                    </>
                                )}
                                <option value="regex">regex</option>
                            </select>

                            <input
                                type={formData.field === 'amount' ? 'number' : 'text'}
                                value={formData.value}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder="Valor..."
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Acción</h4>
                        <div className="form-row">
                            <select
                                value={formData.category}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>

                            {formData.category && (
                                <select
                                    value={formData.subcategory}
                                    onChange={(e) => handleFieldChange('subcategory', e.target.value)}
                                >
                                    <option value="">Otros</option>
                                    {getSubcategoriesForCategory(formData.category).map(sub => (
                                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn-secondary" onClick={handleCancelEdit}>
                            Cancelar
                        </button>
                        <button className="btn-primary" onClick={handleSaveRule}>
                            {editingRule ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="rules-list">
                {rules.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay reglas configuradas</p>
                        <p className="hint">Las reglas te permiten categorizar automáticamente transacciones basadas en patrones</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Condición</th>
                                <th>Categoría</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id} className={!rule.enabled ? 'disabled' : ''}>
                                    <td>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={rule.enabled}
                                                onChange={() => handleToggleRule(rule)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <span className="condition-text">
                                            {rule.condition.field} {getOperatorLabel(rule.condition.operator)} "{rule.condition.value}"
                                        </span>
                                    </td>
                                    <td>
                                        <span className="category-badge">
                                            {rule.action.category}
                                            {rule.action.subcategory && ` → ${rule.action.subcategory}`}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEditRule(rule)}
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDeleteRule(rule.id)}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
