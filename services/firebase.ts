
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

const config = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || storedConfig?.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || storedConfig?.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || storedConfig?.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || storedConfig?.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || storedConfig?.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || storedConfig?.appId
};

console.log("[AutoCars Debug] Verificando chaves de ambiente...");

// Verificação de chaves ausentes
const missingKeys: string[] = [];
if (!config.apiKey) missingKeys.push("VITE_FIREBASE_API_KEY");
if (!config.authDomain) missingKeys.push("VITE_FIREBASE_AUTH_DOMAIN");
if (!config.projectId) missingKeys.push("VITE_FIREBASE_PROJECT_ID");

let app = null;
let db = null;
let auth = null;

if (missingKeys.length > 0) {
  console.warn(`[AutoCars Firebase] ⚠️ MODO OFFLINE ATIVADO.`);
  console.warn(`[AutoCars Firebase] Chaves não detectadas via ENV. Verificando configuração manual...`);
} 

// Tenta inicializar se tivermos configuração válida (seja via ENV ou LocalStorage)
if (config.apiKey && config.projectId) {
  try {
    console.log("[AutoCars Firebase] ✅ Configuração encontrada. Inicializando Firebase...");
    app = initializeApp(config as any);
    db = getFirestore(app);
    auth = getAuth(app);
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

export { db, auth };
export const isFirebaseConfigured = !!app;
