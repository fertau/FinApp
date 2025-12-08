import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import Layout from './components/Layout'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import FinPilotChat from './components/FinPilotChat'
import Settings from './components/Settings'
import ProfileSwitcher from './components/ProfileSwitcher'
import ImportReview from './components/ImportReview'
import ImportManager from './components/ImportManager'
import RecurringExpensesView from './components/RecurringExpensesView'

import { extractTextFromPdf } from './utils/pdfParser'
import { getParserForFile } from './utils/parsers/parserFactory'
import { categorizeTransaction } from './utils/categorizer'
import { detectAccountAndOwner } from './utils/accountDetector'
import { SyncProvider } from './context/SyncContext'
import OnboardingTutorial from './components/OnboardingTutorial'

import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState(null); // For review screen
  const [editingFile, setEditingFile] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Load profile from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('activeProfileId');
    if (savedProfile) setProfileId(parseInt(savedProfile));

    // Check tutorial status
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }

    // Auto-fetch exchange rate if not set or old?
    // For now just try to fetch on load to keep it fresh
    // Auto-fetch exchange rate from DolarAPI
    import('./services/CurrencyService').then(({ CurrencyService }) => {
      CurrencyService.fetchCurrentRates().then(async rates => {
        if (rates && rates.oficial) {
          // Update Settings state (for UI display)
          setSettings(prev => ({ ...prev, exchangeRate: rates.oficial.sell }));

          // Update DB with today's rate
          // We use the update date from API or today's date?
          // API returns ISO string. Let's use that date.
          const apiDate = new Date(rates.oficial.date);
          const dateStr = apiDate.toISOString().split('T')[0];

          // Use ExchangeRateService to save it
          const { ExchangeRateService } = await import('./services/ExchangeRateService');
          await ExchangeRateService.setRate(dateStr, rates.oficial.sell, 'USD');
          console.log(`Updated Official Rate for ${dateStr}: ${rates.oficial.sell}`);
        }
      });
    });
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleSelectProfile = (id) => {
    setProfileId(id);
    localStorage.setItem('activeProfileId', id);
  };

  const handleLogout = () => {
    setProfileId(null);
    localStorage.removeItem('activeProfileId');
  };

  // Use Dexie live query for transactions, filtered by profile
  const transactions = useLiveQuery(
    () => profileId ? db.transactions.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  ) || [];

  const members = useLiveQuery(
    () => profileId ? db.members.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  );

  const paymentMethods = useLiveQuery(
    () => profileId ? db.paymentMethods.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  );

  const categories = useLiveQuery(
    () => profileId ? db.categories.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  ) || [];

  const subcategories = useLiveQuery(
    () => db.subcategories.toArray()
  ) || [];

  const rules = useLiveQuery(
    () => profileId ? db.rules.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  ) || [];

  const cardMappings = useLiveQuery(
    () => profileId ? db.cardMappings.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  ) || [];

  // Load settings from localStorage (still used for non-DB settings like Exchange Rate)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('financeSettings');
    return saved ? JSON.parse(saved) : { accounts: [] };
  });

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('financeSettings', JSON.stringify(newSettings));
  };

  const handleFilesSelected = async (selectedFiles, parsingMethod = 'regex') => {
    setFiles(selectedFiles);
    setIsProcessing(true);

    try {
      const allTransactions = [];

      // Prepare rules for categorizer (map IDs to names if needed, but our categorizer expects names)
      // We need to join rules with categories/subcategories to get names
      // Or we can just store names in rules for simplicity? 
      // Let's assume we resolve them here.
      const resolvedRules = rules.map(r => {
        const cat = categories.find(c => c.id === r.categoryId);
        const sub = subcategories.find(s => s.id === r.subcategoryId);
        return {
          keyword: r.keyword,
          categoryName: sub ? sub.name : (cat ? cat.name : 'Uncategorized'),
          type: 'expense' // Default
        };
      });

      for (const file of selectedFiles) {
        const text = await extractTextFromPdf(file);

        // Pass settings to detector
        const { account, owner } = detectAccountAndOwner(text, file.name, settings);

        // Use factory to get the right parser, passing card mappings and options
        // parsingMethod is passed as the second argument to handleFilesSelected if I update the signature
        // But wait, handleFilesSelected signature is (selectedFiles).
        // I need to update handleFilesSelected signature first.

        // Actually, let's look at how I called it in ImportManager: onUpload(files, method)
        // So I need to update the function definition below.

        const parser = getParserForFile(text, file.name, cardMappings, {
          method: parsingMethod,
          apiKey: settings.geminiApiKey
        });
        const fileTransactions = await parser.parse(); // AI Parser is async!

        // Categorize
        const categorized = fileTransactions.map(t => {
          // If parser detected an owner (via card mapping), use it. Otherwise fallback to detector.
          const finalOwner = t.owner || owner;

          const { type, subcategory } = categorizeTransaction(t.description, t.amount, finalOwner, account, resolvedRules);
          return {
            ...t,
            owner: finalOwner,
            account,
            type: t.type || type, // Use parser type (e.g. payment) if available, else categorizer type
            category: t.type === 'payment' ? 'Payment' : subcategory, // Force Payment category if type is payment
            originalCategory: subcategory,
            sourceFile: file.name,
            profileId,
            bank: t.bank,
            cardBrand: t.cardBrand,
            paymentMethod: t.paymentMethod,
            currency: t.currency,
            installment: t.installment,
            totalInstallments: t.totalInstallments,
            isInstallment: t.isInstallment
          };
        });

        allTransactions.push(...categorized);
      }

      // Instead of saving directly, set pending for review
      setPendingTransactions(allTransactions);

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files. See console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveImport = async (approvedTransactions) => {
    // 1. Learn from changes
    const newRules = [];
    for (const t of approvedTransactions) {
      if (t.category !== t.originalCategory && t.category !== 'Uncategorized') {
        // User changed category. Create a rule.
        // Find Category/Subcategory IDs
        const sub = subcategories.find(s => s.name === t.category);
        const cat = sub
          ? categories.find(c => c.id === sub.categoryId)
          : categories.find(c => c.name === t.category);

        if (cat) {
          // Check if rule already exists to avoid duplicates (simple check)
          const exists = rules.some(r => r.keyword === t.description && r.profileId === profileId);
          if (!exists) {
            newRules.push({
              keyword: t.description, // Use full description as keyword for now
              categoryId: cat.id,
              subcategoryId: sub ? sub.id : null,
              profileId
            });
          }
        }
      }
    }

    if (newRules.length > 0) {
      await db.rules.bulkAdd(newRules);
      console.log(`Learned ${newRules.length} new rules!`);
    }

    // 2. Save Transactions
    if (editingFile) {
      // If editing, delete old transactions for this file first
      const toDelete = await db.transactions.where('profileId').equals(profileId).filter(t => t.sourceFile === editingFile).primaryKeys();
      await db.transactions.bulkDelete(toDelete);
      setEditingFile(null);
    }
    await db.transactions.bulkAdd(approvedTransactions);
    setPendingTransactions(null);
    setActiveTab('dashboard');
  };

  const handleCreateCategory = async (name, parentId = null) => {
    if (!profileId) return;

    // Check if exists
    if (parentId) {
      // Subcategory
      const exists = subcategories.some(s => s.name.toLowerCase() === name.toLowerCase() && s.categoryId === parentId);
      if (!exists) {
        await db.subcategories.add({ name, categoryId: parentId });
      }
    } else {
      // Category
      const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.profileId === profileId);
      if (!exists) {
        // Assign a random color or default
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        await db.categories.add({ name, profileId, color, type: 'expense' });
      }
    }
  };

  const handleCreatePaymentMethod = async (name, type = 'credit_card', currency = 'ARS') => {
    if (!profileId) return;
    const exists = paymentMethods.some(pm => pm.name.toLowerCase() === name.toLowerCase() && pm.profileId === profileId);
    if (!exists) {
      await db.paymentMethods.add({ name, type, currency, profileId });
    }
  };

  const handleEditFile = async (filename) => {
    const fileTransactions = await db.transactions
      .where('profileId').equals(profileId)
      .filter(t => t.sourceFile === filename)
      .toArray();

    if (fileTransactions.length > 0) {
      setEditingFile(filename);
      setPendingTransactions(fileTransactions);
    }
  };

  const [fileToDelete, setFileToDelete] = useState(null);

  const handleDeleteFile = (filename) => {
    setFileToDelete(filename);
  };

  const executeDeleteFile = async () => {
    if (fileToDelete) {
      const toDelete = await db.transactions.where('profileId').equals(profileId).filter(t => t.sourceFile === fileToDelete).primaryKeys();
      await db.transactions.bulkDelete(toDelete);
      setFileToDelete(null);
    }
  };

  const handleUpdateTransaction = async (id, updates) => {
    const transaction = await db.transactions.get(id);
    if (!transaction) return;

    // Re-categorize if owner or account changes
    let newUpdates = { ...updates };
    if (updates.owner || updates.account) {
      const newOwner = updates.owner || transaction.owner;
      const newAccount = updates.account || transaction.account;
      const { type, subcategory } = categorizeTransaction(transaction.description, transaction.amount, newOwner, newAccount);
      newUpdates.type = type;
      newUpdates.category = subcategory;
    }

    await db.transactions.update(id, newUpdates);
  };

  const handleDeleteTransaction = async (id) => {
    await db.transactions.delete(id);
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL transactions for this profile? This cannot be undone.')) {
      await db.transactions.where('profileId').equals(profileId).delete();
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    if (isProcessing) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Procesando {files.length} archivos...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            <Dashboard
              transactions={transactions}
              exchangeRate={settings.exchangeRate}
              categories={categories}
              subcategories={subcategories}
              paymentMethods={paymentMethods}
              apiKey={settings.geminiApiKey}
            />
          </div>
        );
      case 'records':
        return <TransactionList
          transactions={transactions}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          categories={categories}
          subcategories={subcategories}
          members={members}
          paymentMethods={paymentMethods}
        />;
      case 'analytics':
        return <FinPilotChat transactions={transactions} />;

      case 'imports':
        return (
          <ImportManager
            transactions={transactions}
            onUpload={handleFilesSelected}
            onEdit={handleEditFile}
            onDelete={handleDeleteFile}
          />
        );
      case 'settings':
        return <Settings settings={settings} onSave={handleSaveSettings} profileId={profileId} />;
      default:
        return <Dashboard transactions={transactions} exchangeRate={settings.exchangeRate} />;
    }
  };

  if (!profileId) {
    return <ProfileSwitcher currentProfileId={profileId} onSelectProfile={handleSelectProfile} />;
  }

  // ... (keep all the logic inside AppContent)
  // This is a bit tricky with replace_file_content for a large block.
  // I should probably use write_to_file or be very careful.
  // Actually, I can just rename the function App to AppContent and add the wrapper at the bottom.

  // Let's try to just rename the function definition and export.

  // Wait, I need to close the AppContent function and define App.
  // The previous tool call replaced the top part.
  // Now I need to fix the bottom part.

  return (
    <>
      {pendingTransactions && (
        <ImportReview
          transactions={pendingTransactions}
          onSave={handleApproveImport}
          onCancel={() => {
            setPendingTransactions(null);
            setEditingFile(null);
          }}
          members={members}
          paymentMethods={paymentMethods}
          categories={categories}
          subcategories={subcategories}
          settings={settings}
          onCreateCategory={handleCreateCategory}
          onCreatePaymentMethod={handleCreatePaymentMethod}
        />
      )}
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>

      {fileToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg-primary)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Confirmar Eliminación</h3>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
              ¿Estás seguro de que quieres eliminar todas las transacciones de <strong>{fileToDelete}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setFileToDelete(null)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteFile}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--color-error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && <OnboardingTutorial onComplete={handleTutorialComplete} />}
    </>
  )
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SyncProvider>
      <AppContent />
    </SyncProvider>
  )
}

export default App
