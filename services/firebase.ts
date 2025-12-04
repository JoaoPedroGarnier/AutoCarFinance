
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Avoid TypeScript errors with process.env
declare const process: any;

// Function to get config from environment variables
const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  // Debugging: Check which keys are missing
  const missingKeys = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.warn(`[AutoCars Firebase] Conexão desativada. Faltam as seguintes chaves de configuração: ${missingKeys.join(', ')}`);
    console.info(`[AutoCars Firebase] O sistema funcionará em Modo Local (Offline). Configure as variáveis de ambiente no seu provedor de hospedagem para ativar a sincronização.`);
    return null;
  }

  console.log("[AutoCars Firebase] Configuração encontrada. Inicializando nuvem...");
  return config;
};

const config = getFirebaseConfig();
const app = config ? initializeApp(config) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export const isFirebaseConfigured = !!app;
