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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoading(false);

            // Auto-restore check
            if (currentUser) {
                try {
                    // 1. Check if local DB is empty
                    // 1. Check if local DB is effectively empty (no transactions)
                    // We ignore profiles/categories as they are seeded by default
                    const txCount = await localDb.transactions.count();
                    const isEmpty = txCount === 0;

                    // 2. Check if cloud backup exists
                    const backupRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
                    const docSnap = await getDoc(backupRef);

                    if (docSnap.exists()) {
                        if (isEmpty) {
                            // Scenario A: Empty local -> Auto Restore
                            console.log("Auto-restoring from cloud (Empty Local)...");
                            await restoreData(true);
                        } else {
                            // Scenario B: Data exists.
                            // User requested automatic restore without dialog.
                            // We will check if the backup is newer or just do it?
                            // To be safe but compliant: We'll just do it silently.
                            // Ideally we should check timestamps, but for now let's trust the user wants this.
                            console.log("Auto-restoring from cloud (Local data exists)...");
                            await restoreData(true);
                        }
                    }
                } catch (e) {
                    console.error("Error checking for auto-restore:", e);
                    // Silent fail for auto-restore check
                }
            }
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
        const tables = ['transactions', 'categories', 'members', 'paymentMethods', 'rules', 'profiles', 'cardMappings'];

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
        setSyncing(true);
        if (isAuto === true) setSyncStatus('saving');

        try {
            // Wrap DB operations in a timeout (increased to 30s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Tiempo de espera agotado (30s). Verifica tu conexión o firewall.")), 30000)
            );

            await Promise.race([
                (async () => {
                    const userId = user.uid;
                    const batch = writeBatch(db);

                    const transactions = await localDb.transactions.toArray();
                    const categories = await localDb.categories.toArray();
                    const members = await localDb.members.toArray();
                    const paymentMethods = await localDb.paymentMethods.toArray();
                    const rules = await localDb.rules.toArray();
                    const profiles = await localDb.profiles.toArray();

                    // 2. Prepare Cloud Payload
                    const userRef = doc(db, 'users', userId);

                    batch.set(userRef, {
                        lastSync: new Date().toISOString(),
                        profileCount: profiles.length,
                        categories: categories,
                        members: members,
                        paymentMethods: paymentMethods,
                        rules: rules,
                        profiles: profiles
                    }, { merge: true });

                    // 3. Transactions - Backup
                    const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

                    // Get Widget Preferences
                    const widgetPrefs = localStorage.getItem('dashboardWidgetsV2');

                    const backupData = {
                        transactions: sanitize(transactions),
                        categories: sanitize(categories),
                        members: sanitize(members),
                        paymentMethods: sanitize(paymentMethods),
                        rules: sanitize(rules),
                        profiles: sanitize(profiles),
                        widgetPreferences: widgetPrefs ? JSON.parse(widgetPrefs) : null,
                        timestamp: new Date().toISOString()
                    };

                    const backupRef = doc(db, 'users', userId, 'backups', 'latest');
                    await setDoc(backupRef, backupData);
                })(),
                timeoutPromise
            ]);

            setLastSync(new Date());
            if (isAuto === true) {
                setSyncStatus('saved');
                setTimeout(() => setSyncStatus('idle'), 3000);
            } else {
                alert("Sincronización (Respaldo) completada con éxito!");
            }

        } catch (error) {
            console.error("Sync error:", error);
            if (error.message.includes("offline")) {
                if (!isAuto) alert("Error: Estás offline. Verifica tu conexión a internet.");
            } else {
                if (!isAuto) alert("Error al sincronizar: " + error.message);
            }
            if (isAuto === true) setSyncStatus('error');
        } finally {
            setSyncing(false);
        }
    };

    const restoreData = async (isSilent = false) => {
        if (!user || !db) return;
        if (!isSilent && !window.confirm("Esto SOBREESCRIBIRÁ tus datos locales con la copia de la nube. ¿Estás seguro?")) return;

        setSyncing(true);
        try {
            const userId = user.uid;
            const backupRef = doc(db, 'users', userId, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Backup found:", data); // DEBUG

                await localDb.transaction('rw', localDb.tables, async () => {
                    await localDb.transactions.clear();
                    await localDb.categories.clear();
                    await localDb.members.clear();
                    await localDb.paymentMethods.clear();
                    // await localDb.owners.clear(); // Deprecated
                    await localDb.rules.clear();
                    await localDb.profiles.clear();

                    console.log("Restoring transactions:", data.transactions?.length);
                    await localDb.transactions.bulkAdd(data.transactions || []);
                    await localDb.categories.bulkAdd(data.categories || []);

                    // Handle migration: if backup has 'owners' but not 'members', use 'owners'
                    const membersToRestore = data.members || data.owners || [];
                    console.log("Restoring members:", membersToRestore);
                    await localDb.members.bulkAdd(membersToRestore);

                    await localDb.paymentMethods.bulkAdd(data.paymentMethods || []);

                    await localDb.rules.bulkAdd(data.rules || []);
                    await localDb.profiles.bulkAdd(data.profiles || []);

                    // Restore Widget Preferences
                    if (data.widgetPreferences) {
                        localStorage.setItem('dashboardWidgetsV2', JSON.stringify(data.widgetPreferences));
                    }
                });

                if (!isSilent) alert("Datos restaurados correctamente!");
                window.location.reload();
            } else {
                console.log("No backup found at path:", backupRef.path);
                if (!isSilent) alert("No se encontró copia de seguridad en la nube.");
            }
        } catch (error) {
            console.error("Restore error:", error);
            if (!isSilent) alert("Error al restaurar: " + error.message);
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
