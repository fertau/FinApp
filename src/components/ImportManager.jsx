import React, { useMemo } from 'react';
import { FileText, Edit, Trash2, UploadCloud } from 'lucide-react';
import FileUpload from './FileUpload';

export default function ImportManager({ transactions, onUpload, onEdit, onDelete }) {
    // Group transactions by sourceFile
    const files = useMemo(() => {
        const fileMap = {};
        transactions.forEach(t => {
            if (!t.sourceFile) return;
            if (!fileMap[t.sourceFile]) {
                fileMap[t.sourceFile] = {
                    name: t.sourceFile,
                    count: 0,
                    minDate: t.date,
                    maxDate: t.date
                };
            }
            const f = fileMap[t.sourceFile];
            f.count++;
            if (t.date < f.minDate) f.minDate = t.date;
            if (t.date > f.maxDate) f.maxDate = t.date;
        });
        return Object.values(fileMap).sort((a, b) => b.maxDate.localeCompare(a.maxDate));
    }, [transactions]);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Importar Resúmenes</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>Sube tus resúmenes en PDF para procesar las transacciones.</p>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="parsingMethod"
                            value="regex"
                            defaultChecked
                            onChange={(e) => window.parsingMethod = e.target.value}
                        />
                        <span>Modo Rápido (Regex)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="parsingMethod"
                            value="ai"
                            onChange={(e) => window.parsingMethod = e.target.value}
                        />
                        <span>Modo Inteligente (IA - Gemini)</span>
                    </label>
                </div>
                <FileUpload onFilesSelected={(files) => onUpload(files, window.parsingMethod || 'regex')} />
            </div>

            <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UploadCloud size={20} />
                    Historial de Importación
                </h3>

                {files.length === 0 ? (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--color-text-tertiary)'
                    }}>
                        Aún no hay archivos importados para este perfil.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {files.map(file => (
                            <div key={file.name} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                backgroundColor: 'var(--color-bg-primary)',
                                border: '1px solid var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'transform 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-accent-primary)'
                                    }}>
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{file.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {file.count} transacciones • {file.minDate} - {file.maxDate}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => onEdit(file.name)}
                                        style={{
                                            padding: '0.5rem',
                                            color: 'var(--color-text-primary)',
                                            backgroundColor: 'transparent',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                        title="Revisar"
                                    >
                                        <Edit size={16} />
                                        <span style={{ fontSize: '0.875rem' }}>Revisar</span>
                                    </button>
                                    <button
                                        onClick={() => onDelete(file.name)}
                                        style={{
                                            padding: '0.5rem',
                                            color: 'var(--color-error)',
                                            backgroundColor: 'transparent',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer'
                                        }}
                                        title="Eliminar Archivo y Transacciones"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
