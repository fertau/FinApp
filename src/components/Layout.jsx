import React from 'react';
import { LayoutDashboard, Receipt, PieChart as PieChartIcon, UploadCloud, Settings as SettingsIcon, Menu, X, FileText, Calendar, Cloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSync } from '../context/SyncContext';

const SyncStatusIndicator = () => {
    const { syncStatus, isConfigured } = useSync();

    if (!isConfigured) return null;

    let icon = <Cloud size={18} />;
    let text = 'Sincronizado';
    let color = 'var(--color-text-tertiary)';

    switch (syncStatus) {
        case 'pending':
            icon = <Cloud size={18} />;
            text = 'Cambios sin guardar...';
            color = 'var(--color-warning)';
            break;
        case 'saving':
            icon = <Loader2 size={18} className="spin" />;
            text = 'Guardando...';
            color = 'var(--color-accent-primary)';
            break;
        case 'saved':
            icon = <CheckCircle size={18} />;
            text = 'Guardado';
            color = 'var(--color-success)';
            break;
        case 'error':
            icon = <AlertCircle size={18} />;
            text = 'Error al guardar';
            color = 'var(--color-error)';
            break;
        default:
            // Idle
            break;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontSize: '0.875rem', fontWeight: 500 }}>
            {icon}
            <span>{text}</span>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: active ? 'var(--color-accent-subtle)' : 'transparent',
            color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            marginBottom: '0.25rem',
            fontWeight: active ? 600 : 500,
            transition: 'all 0.2s ease'
        }}
    >
        <Icon size={20} style={{ marginRight: '0.75rem' }} />
        {label}
    </button>
);

export default function Layout({ children, activeTab, onTabChange }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Sidebar - Desktop */}
            <aside style={{
                width: '260px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRight: '1px solid var(--color-bg-tertiary)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
            }} className="desktop-sidebar">
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        backgroundColor: 'var(--color-accent-primary)',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white'
                    }}>
                        <FileText size={20} />
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>FinPilot</h1>
                </div>

                <nav style={{ flex: 1 }}>
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Panel Principal"
                        active={activeTab === 'dashboard'}
                        onClick={() => onTabChange('dashboard')}
                    />
                    <SidebarItem
                        icon={Receipt}
                        label="Registros"
                        active={activeTab === 'records'}
                        onClick={() => onTabChange('records')}
                    />
                    <SidebarItem
                        icon={PieChartIcon}
                        label="Análisis"
                        active={activeTab === 'analytics'}
                        onClick={() => onTabChange('analytics')}
                    />

                    <SidebarItem
                        icon={UploadCloud}
                        label="Importar"
                        active={activeTab === 'imports'}
                        onClick={() => onTabChange('imports')}
                    />
                    <SidebarItem
                        icon={SettingsIcon}
                        label="Configuración"
                        active={activeTab === 'settings'}
                        onClick={() => onTabChange('settings')}
                    />
                </nav>

                <div style={{ marginTop: 'auto', fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                    <p>FinPilot AI</p>
                    <p>v2.0.0</p>
                </div>
            </aside>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <header style={{
                    height: '64px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1.5rem',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                        {activeTab === 'dashboard' && 'Panel Principal'}
                        {activeTab === 'records' && 'Registros'}
                        {activeTab === 'analytics' && 'Análisis'}

                        {activeTab === 'imports' && 'Importar'}
                        {activeTab === 'settings' && 'Configuración'}
                    </h2>

                    <SyncStatusIndicator />
                </header>

                {/* Content Scroll Area */}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    backgroundColor: 'var(--color-bg-primary)'
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        {children}
                    </div>
                </main>
            </div>
        </div >
    );
}
