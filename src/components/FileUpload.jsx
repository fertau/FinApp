import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';

export default function FileUpload({ onFilesSelected }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type === 'application/pdf' || file.type === 'text/csv' || file.name.endsWith('.csv')
        );

        if (droppedFiles.length > 0) {
            setFiles(prev => [...prev, ...droppedFiles]);
            onFilesSelected(droppedFiles);
        }
    }, [onFilesSelected]);

    const handleFileInput = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files).filter(
            file => file.type === 'application/pdf' || file.type === 'text/csv' || file.name.endsWith('.csv')
        );

        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles]);
            onFilesSelected(selectedFiles);
        }
    }, [onFilesSelected]);

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div style={{ width: '100%' }}>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    border: `2px dashed ${isDragging ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: isDragging ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative'
                }}
            >
                <input
                    type="file"
                    accept=".pdf,.csv"
                    multiple
                    onChange={handleFileInput}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                    }}
                />

                <div style={{ pointerEvents: 'none' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: 'var(--color-accent-primary)'
                    }}>
                        <Upload size={32} />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                        Drop your PDF statements here
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                        or click to browse files
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                        Supports PDF and CSV files. Processed locally.
                    </p>
                </div>
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Selected Files ({files.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {files.map((file, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                backgroundColor: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-sm)',
                                border: '1px solid var(--color-bg-tertiary)'
                            }}>
                                <FileText size={20} style={{ color: 'var(--color-accent-primary)', marginRight: '1rem' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{file.name}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    style={{
                                        padding: '0.5rem',
                                        backgroundColor: 'transparent',
                                        color: 'var(--color-text-tertiary)'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
