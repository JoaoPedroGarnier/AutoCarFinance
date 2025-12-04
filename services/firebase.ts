
import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from "firebase/analytics";

const LOCAL_STORAGE_KEY = 'autocars_firebase_config';

// Helper para obter variáveis de ambiente de forma segura em diferentes ambientes
const getEnv = (key: string) => {
  // Tenta via import.meta.env (Vite padrão)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) { /* ignorar */ }

  // Tenta via process.env (Fallback/Node/Polyfills)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) { /* ignorar */ }
  
  return undefined;
};

// Tenta recuperar configuração salva localmente pelo usuário (via Configurações)
const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storedConfig = getStoredConfig();

// Configuração Fallback fornecida pelo usuário
const fallbackConfig = {
  apiKey: "AIzaSyDd5JG13lpRhWL9a1dbtL_9nYPO74CS3xk",
  authDomain: "autocarfinance-51dda.firebaseapp.com",
  projectId: "autocarfinance-51dda",
  storageBucket: "autocarfinance-51dda.firebasestorage.app",
  messagingSenderId: "154076899806",
  appId: "1:154076899806:web:82f5344ae5be297c59d54f",
  measurementId: "G-VTB1W9DX98"
};

// Helper para selecionar o primeiro valor não vazio
const selectConfig = (envKey: string, storedVal: string | undefined, fallbackVal: string) => {
  const envVal = getEnv(envKey);
  if (envVal && envVal.trim() !== '') return envVal;
  if (storedVal && storedVal.trim() !== '') return storedVal;
  return fallbackVal;
};

const config = {
  apiKey: selectConfig('VITE_FIREBASE_API_KEY', storedConfig?.apiKey, fallbackConfig.apiKey),
  authDomain: selectConfig('VITE_FIREBASE_AUTH_DOMAIN', storedConfig?.authDomain, fallbackConfig.authDomain),
  projectId: selectConfig('VITE_FIREBASE_PROJECT_ID', storedConfig?.projectId, fallbackConfig.projectId),
  storageBucket: selectConfig('VITE_FIREBASE_STORAGE_BUCKET', storedConfig?.storageBucket, fallbackConfig.storageBucket),
  messagingSenderId: selectConfig('VITE_FIREBASE_MESSAGING_SENDER_ID', storedConfig?.messagingSenderId, fallbackConfig.messagingSenderId),
  appId: selectConfig('VITE_FIREBASE_APP_ID', storedConfig?.appId, fallbackConfig.appId),
  measurementId: selectConfig('VITE_FIREBASE_MEASUREMENT_ID', storedConfig?.measurementId, fallbackConfig.measurementId)
};

console.log("[AutoCars Debug] Inicializando Firebase...");

// Verificação de chaves ausentes
const missingKeys: string[] = [];
if (!config.apiKey) missingKeys.push("API_KEY");
if (!config.projectId) missingKeys.push("PROJECT_ID");

// Definição de tipos explícitos para evitar erro TS7005 (implicit any)
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

if (missingKeys.length > 0) {
  console.warn(`[AutoCars Firebase] ⚠️ MODO OFFLINE ATIVADO. Chaves ausentes: ${missingKeys.join(', ')}`);
} 

// Tenta inicializar se tivermos configuração válida
if (config.apiKey && config.projectId) {
  try {
    console.log("[AutoCars Firebase] ✅ Configuração encontrada. Conectando...");
    app = initializeApp(config as any);
    
    // Inicialização do Firestore com Cache Persistente (Offline support)
    // Isso evita o erro "Failed to get document because the client is offline"
    try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (firestoreErr) {
        console.warn("Falha ao inicializar persistência (pode já estar inicializado):", firestoreErr);
        // Fallback se initializeFirestore falhar (raro)
        const { getFirestore } = await import('firebase/firestore');
        db = getFirestore(app);
    }

    auth = getAuth(app);
    
    // Inicialização do Analytics (opcional, pode falhar em alguns ambientes locais)
    try {
      if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
      }
    } catch (analyticsErr) {
      console.warn("Analytics não pôde ser inicializado (possivelmente bloqueador de anúncios ou ambiente local):", analyticsErr);
    }
    
    console.log("[AutoCars Firebase] Conectado com sucesso.");
  } catch (error) {
    console.error("[AutoCars Firebase] Erro fatal ao inicializar:", error);
    // Se falhar a config manual, limpamos para evitar loop de erro
    if (storedConfig) {
        console.warn("[AutoCars Firebase] Configuração manual inválida detectada.");
    }
  }
}

// Funções para gerenciamento manual da configuração via UI
export const updateFirebaseConfig = (newConfig: any) => {
    if (!newConfig) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    window.location.reload();
};

export const resetFirebaseConfig = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
};

export { db, auth, analytics };
export const isFirebaseConfigured = !!app;
