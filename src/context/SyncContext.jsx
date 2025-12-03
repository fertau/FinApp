import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { db as localDb } from '../db';

const SyncContext = createContext();

export function useSync() {
    return useContext(SyncContext);
}

export function SyncProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, pending, saving, saved, error

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Auto-save Logic
    useEffect(() => {
        if (!user || !localDb) return;

        let timeoutId;

        const handleChange = () => {
            setSyncStatus('pending');
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                syncData(true); // true = auto-save mode (silent)
            }, 5000); // 5 seconds debounce
        };

        // Subscribe to Dexie changes
        // We need to subscribe to 'changes' on the db instance
        // Note: Dexie 'changes' event requires 'dexie-observable' addon usually, 
        // but let's check if we can use a simpler hook or just 'hooks' on tables.
        // Actually, 'db.on("changes")' is from 'dexie-observable'. 
        // If not installed, we can use middleware or hooks.
        // Given the dependencies in package.json (dexie, dexie-react-hooks), we might not have observable.
        // Let's use a simpler approach: A global hook on 'mutating' tables?
        // Or just wrap the write operations? No, that's invasive.

        // Let's try to use 'db.on("mutate")' if available in Dexie 4?
        // Dexie 3/4 has middleware.
        // But simpler: 'useLiveQuery' triggers on changes. We can't easily hook into that globally for *any* change without re-rendering.

        // Let's assume we can attach a hook to all tables.
        const tables = ['transactions', 'categories', 'owners', 'rules', 'profiles', 'cardMappings'];

        const hook = () => {
            handleChange();
        };

        tables.forEach(table => {
            localDb[table].hook('creating', hook);
            localDb[table].hook('updating', hook);
            localDb[table].hook('deleting', hook);
        });

        return () => {
            clearTimeout(timeoutId);
            tables.forEach(table => {
                localDb[table].hook('creating').unsubscribe(hook);
                localDb[table].hook('updating').unsubscribe(hook);
                localDb[table].hook('deleting').unsubscribe(hook);
            });
        };
    }, [user]); // Re-subscribe if user changes

    const login = async () => {
        if (!auth) {
            alert("Firebase no está configurado. Revisa src/firebase.js");
            return;
        }
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login error:", error);
            alert("Error al iniciar sesión: " + error.message);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const syncData = async (isAuto = false) => {
        if (!user || !db) return;
        setSyncing(true);
        if (isAuto) setSyncStatus('saving');

        try {
            const userId = user.uid;
            const batch = writeBatch(db);

            // 1. Get all local data
            const transactions = await localDb.transactions.toArray();
            const categories = await localDb.categories.toArray();
            const owners = await localDb.owners.toArray();
            const rules = await localDb.rules.toArray();
            const profiles = await localDb.profiles.toArray();

            // 2. Prepare Cloud Payload
            const userRef = doc(db, 'users', userId);

            batch.set(userRef, {
                lastSync: new Date().toISOString(),
                profileCount: profiles.length,
                categories: categories,
                owners: owners,
                rules: rules,
                profiles: profiles
            }, { merge: true });

            // 3. Transactions - Backup
            const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

            const backupData = {
                transactions: sanitize(transactions),
                categories: sanitize(categories),
                owners: sanitize(owners),
                rules: sanitize(rules),
                profiles: sanitize(profiles),
                timestamp: new Date().toISOString()
            };

            const backupRef = doc(db, 'users', userId, 'backups', 'latest');
            await setDoc(backupRef, backupData);

            setLastSync(new Date());
            if (isAuto) {
                setSyncStatus('saved');
                setTimeout(() => setSyncStatus('idle'), 3000);
            } else {
                alert("Sincronización (Respaldo) completada con éxito!");
            }

        } catch (error) {
            console.error("Sync error:", error);
            if (isAuto) setSyncStatus('error');
            else alert("Error al sincronizar: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const restoreData = async () => {
        if (!user || !db) return;
        if (!window.confirm("Esto SOBREESCRIBIRÁ tus datos locales con la copia de la nube. ¿Estás seguro?")) return;

        setSyncing(true);
        try {
            const userId = user.uid;
            const backupRef = doc(db, 'users', userId, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                await localDb.transaction('rw', localDb.tables, async () => {
                    await localDb.transactions.clear();
                    await localDb.categories.clear();
                    await localDb.owners.clear();
                    await localDb.rules.clear();
                    await localDb.profiles.clear();

                    await localDb.transactions.bulkAdd(data.transactions);
                    await localDb.categories.bulkAdd(data.categories);
                    await localDb.owners.bulkAdd(data.owners);
                    await localDb.rules.bulkAdd(data.rules);
                    await localDb.profiles.bulkAdd(data.profiles);
                });

                alert("Datos restaurados correctamente!");
                window.location.reload();
            } else {
                alert("No se encontró copia de seguridad en la nube.");
            }
        } catch (error) {
            console.error("Restore error:", error);
            alert("Error al restaurar: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const value = {
        user,
        loading,
        syncing,
        syncStatus,
        lastSync,
        login,
        logout,
        syncData,
        restoreData,
        isConfigured: !!auth
    };

    return (
        <SyncContext.Provider value={value}>
            {!loading && children}
        </SyncContext.Provider>
    );
}
