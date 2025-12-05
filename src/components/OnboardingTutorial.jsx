import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, UploadCloud, PieChart, Receipt, Settings } from 'lucide-react';

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: '¡Bienvenido a Finance Analyzer!',
        content: 'Tu herramienta personal para tomar el control de tus finanzas. Importa resúmenes, categoriza gastos y visualiza a dónde va tu dinero.',
        icon: <PieChart size={64} color="var(--color-accent-primary)" />,
        color: 'var(--color-bg-secondary)'
    },
    {
        id: 'import',
        title: '1. Importa tus Resúmenes',
        content: 'Sube tus resúmenes de tarjeta de crédito (PDF) o bancarios. Nuestro sistema inteligente extraerá y organizará cada transacción automáticamente.',
        icon: <UploadCloud size={64} color="#3B82F6" />,
        color: '#EFF6FF'
    },
    {
        id: 'review',
        title: '2. Revisa y Categoriza',
        content: 'Verifica las transacciones importadas. El sistema aprenderá de tus correcciones para categorizar mejor en el futuro.',
        icon: <Receipt size={64} color="#10B981" />,
        color: '#ECFDF5'
    },
    {
        id: 'dashboard',
        title: '3. Analiza tu Dashboard',
        content: 'Explora gráficos interactivos por categoría, dueño o medio de pago. Haz clic en los gráficos para ver el detalle de cada gasto.',
        icon: <PieChart size={64} color="#8B5CF6" />,
        color: '#F5F3FF'
    },
    {
        id: 'cloud',
        title: '4. Respaldo en la Nube',
        content: 'Inicia sesión con Google en Configuración para activar el auto-guardado y no perder nunca tus datos. ¡Es gratis y seguro!',
        icon: <Settings size={64} color="#F59E0B" />,
        color: '#FFFBEB'
    }
];

export default function OnboardingTutorial({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => {
            onComplete();
        }, 300); // Wait for animation
    };

    if (!isVisible) return null;

    const step = TUTORIAL_STEPS[currentStep];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                backgroundColor: 'var(--color-bg-primary)',
                width: '100%',
                maxWidth: '500px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header Image/Icon Area */}
                <div style={{
                    backgroundColor: step.color,
                    padding: '3rem 2rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'background-color 0.3s ease'
                }}>
                    <div style={{ animation: 'bounce 2s infinite' }}>
                        {step.icon}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ padding: '2rem' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        marginBottom: '1rem',
                        color: 'var(--color-text-primary)',
                        textAlign: 'center'
                    }}>
                        {step.title}
                    </h2>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        textAlign: 'center',
                        lineHeight: 1.6,
                        marginBottom: '2rem',
                        minHeight: '80px' // Prevent layout shift
                    }}>
                        {step.content}
                    </p>

                    {/* Progress Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        {TUTORIAL_STEPS.map((_, index) => (
                            <div
                                key={index}
                                style={{
                                    width: index === currentStep ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    backgroundColor: index === currentStep ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            onClick={handleComplete}
                            style={{
                                color: 'var(--color-text-tertiary)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                padding: '0.5rem'
                            }}
                        >
                            Saltar Tutorial
                        </button>

                        <button
                            onClick={handleNext}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor: 'var(--color-accent-primary)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '1rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                        >
                            {currentStep === TUTORIAL_STEPS.length - 1 ? (
                                <>Comenzar <Check size={18} /></>
                            ) : (
                                <>Siguiente <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes bounce { 
                    0%, 100% { transform: translateY(0); } 
                    50% { transform: translateY(-10px); } 
                }
            `}</style>
        </div>
    );
}
