
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Cloud, Upload, Download, LogIn, LogOut } from 'lucide-react';
import { db } from '../db';
import { useSync } from '../context/SyncContext';

import MemberManager from './MemberManager';
import PaymentMethodManager from './PaymentMethodManager';
import CategoryManager from './CategoryManager';

export default function Settings({ settings, onSave, profileId }) {
    const [exchangeRate, setExchangeRate] = useState(settings.exchangeRate || 1000);

    useEffect(() => {
        setExchangeRate(settings.exchangeRate || 1000);
    }, [settings]);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '2rem' }}>Configuración</h2>

            <MemberManager profileId={profileId} />
            <PaymentMethodManager profileId={profileId} />
            <CategoryManager profileId={profileId} />
            <div>
                <h3 style={{ marginBottom: '0.5rem' }}>Tipo de Cambio (USD a ARS)</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Utilizado para calcular el balance total en Pesos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>1 USD = </span>
                <input
                    type="number"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(parseFloat(e.target.value))}
                    style={{ width: '100px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-bg-tertiary)', textAlign: 'right' }}
                />
                <span>ARS</span>
                <button
                    onClick={async () => {
                        const { fetchExchangeRates } = await import('../utils/currencyUtils');
                        const rates = await fetchExchangeRates();
                        if (rates && rates.blue) {
                            setExchangeRate(rates.blue);
                            alert(`Actualizado a Dólar Blue: $${rates.blue}`);
                        } else {
                            alert('No se pudo obtener la cotización.');
                        }
                    }}
                    style={{
                        marginLeft: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}
                >
                    🔄 Auto (Blue)
                </button>
            </div>

            {/* AI Configuration */}
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Inteligencia Artificial (Gemini API)</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    Ingresa tu API Key de Google Gemini para habilitar la categorización automática inteligente.
                    <br />
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 500, marginTop: '0.5rem', display: 'inline-block' }}>
                        Obtener API Key gratis aquí &rarr;
                    </a>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="password"
                        placeholder="Ingresa tu API Key aquí..."
                        value={settings.geminiApiKey || ''}
                        onChange={e => onSave({ ...settings, geminiApiKey: e.target.value })}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-bg-tertiary)' }}
                    />
                    <button
                        onClick={async () => {
                            if (!settings.geminiApiKey) {
                                alert("Por favor ingresa una API Key primero.");
                                return;
                            }
                            try {
                                // Test by listing models directly via REST API
                                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${settings.geminiApiKey}`);

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error?.message || response.statusText);
                                }

                                const data = await response.json();
                                const modelNames = data.models?.map(m => m.name.replace('models/', '')).filter(n => n.includes('gemini'));

                                if (modelNames && modelNames.length > 0) {
                                    alert(`¡Conexión Exitosa!\n\nTu API Key es válida.\nModelos disponibles:\n- ${modelNames.slice(0, 5).join('\n- ')}\n...`);
                                } else {
                                    alert("Conexión exitosa pero no se encontraron modelos Gemini disponibles para esta Key.");
                                }

                            } catch (e) {
                                console.error(e);
                                alert("Error de conexión: " + e.message + "\n\nVerifica que la Key sea correcta y tenga permisos.");
                            }
                        }}
                        style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        Probar Conexión
                    </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                    Tu clave se guarda localmente en tu navegador y nunca se comparte.
                </p>
            </div>

            {/* Data Migration Section */}
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Migración de Datos</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    Si tienes datos anteriores a la actualización de "Perfiles" (categorías o transacciones perdidas), haz clic abajo para asignarlos al perfil actual.
                </p>
                <button
                    onClick={async () => {
                        if (window.confirm('Esto asignará TODAS las categorías, dueños y transacciones "huérfanas" al perfil ACTUAL. ¿Continuar?')) {
                            try {
                                // 1. Categories
                                const orphanedCats = await db.categories.filter(c => !c.profileId).toArray();
                                await db.categories.bulkPut(orphanedCats.map(c => ({ ...c, profileId })));

                                // 2. Members
                                const orphanedMembers = await db.members.filter(m => !m.profileId).toArray();
                                await db.members.bulkPut(orphanedMembers.map(m => ({ ...m, profileId })));

                                // 3. Transactions
                                const orphanedTrans = await db.transactions.filter(t => !t.profileId).toArray();
                                await db.transactions.bulkPut(orphanedTrans.map(t => ({ ...t, profileId })));

                                // 4. Rules
                                const orphanedRules = await db.rules.filter(r => !r.profileId).toArray();
                                await db.rules.bulkPut(orphanedRules.map(r => ({ ...r, profileId })));

                                alert(`Migrado:\n${orphanedCats.length} Categorías\n${orphanedMembers.length} Usuarios\n${orphanedTrans.length} Transacciones\n${orphanedRules.length} Reglas`);
                            } catch (e) {
                                console.error(e);
                                alert('Error migrando datos: ' + e.message);
                            }
                        }
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-text-primary)',
                        color: 'var(--color-bg-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Migrar Datos Antiguos al Perfil Actual
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                    onClick={() => {
                        onSave({ ...settings, exchangeRate });
                        alert('Configuración guardada!');
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--color-accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Save size={18} />
                    Guardar Configuración
                </button>
            </div>

            <CloudSyncSection />
        </div >
    );
}

function CloudSyncSection() {
    const { user, login, logout, syncData, restoreData, syncing, isConfigured } = useSync();

    return (
        <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Cloud size={24} color="var(--color-accent-primary)" />
                <h3 style={{ margin: 0 }}>Sincronización en la Nube (Firebase)</h3>
            </div>

            {!isConfigured ? (
                <div style={{ padding: '1rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: 'var(--radius-md)', color: '#c2410c' }}>
                    <strong>Firebase no configurado.</strong> Edita <code>src/firebase.js</code> con tus credenciales para habilitar esta función.
                </div>
            ) : !user ? (
                <div>
                    <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Inicia sesión con Google para respaldar tus datos.</p>
                    <button onClick={login} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                        <LogIn size={18} /> Iniciar Sesión con Google
                    </button>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <p style={{ fontWeight: 500 }}>Conectado como: {user.email}</p>
                            <button onClick={logout} style={{ fontSize: '0.875rem', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.25rem' }}>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={syncData}
                            disabled={syncing}
                            style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Upload size={24} />
                            <span style={{ fontWeight: 600 }}>Respaldar en Nube</span>
                            <span style={{ fontSize: '0.75rem' }}>Sube tus datos locales</span>
                        </button>

                        <button
                            onClick={restoreData}
                            disabled={syncing}
                            style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Download size={24} />
                            <span style={{ fontWeight: 600 }}>Restaurar de Nube</span>
                            <span style={{ fontSize: '0.75rem' }}>Sobreescribe datos locales</span>
                        </button>
                    </div>
                    {syncing && <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Sincronizando...</p>}
                </div>
            )}
        </div>
    );
}
