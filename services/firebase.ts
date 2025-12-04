import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, getFirestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from "firebase/analytics";

// Configuração fixa e validada para garantir conexão imediata
// Evita problemas com variáveis de ambiente na Vercel/GitHub Pages
const firebaseConfig = {
  apiKey: "AIzaSyDd5JG13lpRhWL9a1dbtL_9nYPO74CS3xk",
  authDomain: "autocarfinance-51dda.firebaseapp.com",
  projectId: "autocarfinance-51dda",
  storageBucket: "autocarfinance-51dda.firebasestorage.app",
  messagingSenderId: "154076899806",
  appId: "1:154076899806:web:82f5344ae5be297c59d54f",
  measurementId: "G-VTB1W9DX98"
};

console.log("[AutoCars Debug] Inicializando Firebase...");

// Variáveis exportadas com tipagem explícita
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Inicialização do Firestore com suporte Offline (Cache Persistente)
  // Utiliza try-catch para evitar falhas se já estiver inicializado ou ambiente incompatível
  try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
  } catch (err) {
      console.warn("Cache persistente não pôde ser ativado, usando Firestore padrão:", err);
      db = getFirestore(app);
  }

  auth = getAuth(app);
  
  // Analytics (opcional, protegido contra erros de AdBlockers)
  try {
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }
  } catch (e) {
    console.warn("Analytics ignorado.");
  }

  console.log("[AutoCars Firebase] Conectado com sucesso.");
} catch (error) {
  console.error("[AutoCars Firebase] Erro crítico na inicialização:", error);
}

// Funções de gerenciamento de config (mantidas para compatibilidade com Settings.tsx, mas simplificadas)
export const updateFirebaseConfig = (newConfig: any) => {
    console.warn("Configuração manual desativada em favor da configuração fixa.");
    window.location.reload();
};

export const resetFirebaseConfig = () => {
    console.warn("Reset desativado.");
};

export { db, auth, analytics };
export const isFirebaseConfigured = !!app;