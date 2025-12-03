import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
// 1. Ve a https://console.firebase.google.com/
// 2. Entra a tu proyecto (o crea uno nuevo)
// 3. Ve a "Configuración del proyecto" (engranaje arriba a la izquierda)
// 4. Baja hasta "Tus apps" y selecciona el icono de Web (</>)
// 5. Registra la app (ponle cualquier nombre)
// 6. Copia el objeto "firebaseConfig" que te aparece y reemplaza el de abajo:

const firebaseConfig = {
    apiKey: "AIzaSyCWH17Z_rH0s3JjUVaYeat4HZDXWLxbY-Y",
    authDomain: "finapp-67711.firebaseapp.com",
    projectId: "finapp-67711",
    storageBucket: "finapp-67711.firebasestorage.app",
    messagingSenderId: "1000664353896",
    appId: "1:1000664353896:web:7c54dfa7bfaf896b6d3fdd"
};

// Initialize Firebase
// We wrap this in a try-catch or check if config is valid to avoid crashing if not set
let app;
let auth;
let db;
let googleProvider;

try {
    // Simple check to see if config is replaced
    if (firebaseConfig.apiKey !== "AIzaSyCWH17Z_rH0s3JjUVaYeat4HZDXWLxbY") {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
    } else {
        console.warn("Firebase config not set. Cloud sync will not work.");
    }
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

export { auth, db, googleProvider };
