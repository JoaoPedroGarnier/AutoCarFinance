
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Customer, Sale, Expense, VehicleStatus, FuelType, StoreProfile, User } from '../types';
import { db, auth, isFirebaseConfigured } from './firebase';
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// --- CONSTANTES ---
const USERS_STORAGE_KEY = 'autocars_users';
const DATA_STORAGE_PREFIX = 'autocars_data_';

const EMPTY_STORE_PROFILE: StoreProfile = {
  name: '',
  email: '',
  phone: '',
  targetMargin: 20
};

interface StoreContextType {
  vehicles: Vehicle[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  storeProfile: StoreProfile;
  isAuthenticated: boolean;
  currentUser: User | null;
  isCloudSyncing: boolean;
  addVehicle: (v: Vehicle) => Promise<void>;
  updateVehicle: (v: Vehicle) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  addSale: (s: Sale) => Promise<void>;
  addExpense: (e: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  updateStoreProfile: (p: StoreProfile) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (user: Omit<User, 'id'>, accessCode: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  exportData: () => void;
  getDataForExport: () => string;
  importData: (jsonData: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local User Cache
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return savedUsers ? JSON.parse(savedUsers) : [];
    } catch { return []; }
  });
  
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(EMPTY_STORE_PROFILE);

  // --- HELPER: INITIALIZE EMPTY STATE ---
  const initializeEmptyState = (userName: string, userEmail: string) => {
     setVehicles([]);
     setCustomers([]);
     setSales([]);
     setExpenses([]);
     setStoreProfile({
       name: userName,
       email: userEmail,
       phone: '',
       targetMargin: 20
     });
     setIsDataLoaded(true);
  };

  // --- 1. PERSISTÊNCIA LOCAL (FALLBACK) ---
  useEffect(() => {
    if (currentUser && isAuthenticated && isDataLoaded && (!isFirebaseConfigured || !db)) {
      const dataToSave = {
        vehicles, customers, sales, expenses, storeProfile, lastUpdated: new Date().toISOString()
      };
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated, isDataLoaded]);

  // --- 2. GERENCIAMENTO DE SESSÃO FIREBASE ---
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      setPersistence(auth, browserLocalPersistence).catch(console.error);

      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Se o usuário logou via Firebase, priorizamos os dados da nuvem
          let storeName = '';
          
          if (db) {
             try {
                 const userDoc = await getDoc(doc(db, 'stores', firebaseUser.uid));
                 if (userDoc.exists()) {
                     const d = userDoc.data();
                     storeName = d.storeProfile?.name || '';
                 }
             } catch (e) {
                 // Ignora erro offline na leitura inicial, o onSnapshot lidará com isso depois
                 console.warn("[AutoCars] Leitura de perfil inicial falhou (offline):", e);
             }
          }

          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            password: '', 
            storeName,
            role: 'user'
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          // Se o Firebase deslogou, SÓ resetamos se não houver um usuário LOCAL ativo.
          // Isso impede que problemas de rede ou delays do Firebase expulsem um usuário local.
          if (!currentUser || (currentUser && users.some(u => u.id === currentUser.id && u.email === currentUser.email))) {
             // É um usuário local, mantenha logado
          } else {
             setCurrentUser(null);
             setIsAuthenticated(false);
             setIsDataLoaded(false);
             setVehicles([]);
             setCustomers([]);
             setSales([]);
             setExpenses([]);
             setStoreProfile(EMPTY_STORE_PROFILE);
          }
        }
      });
      return () => unsubscribeAuth();
    }
  }, []); // Dependência vazia para rodar apenas no mount

  // --- 3. SINCRONIZAÇÃO DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    // Só sincroniza se estiver autenticado no Firebase E configurado
    if (isAuthenticated && currentUser && isFirebaseConfigured && db && auth?.currentUser?.uid === currentUser.id) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      
      unsubscribeSnapshot = onSnapshot(userStoreRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setVehicles(data.vehicles || []);
          setCustomers(data.customers || []);
          setSales(data.sales || []);
          setExpenses(data.expenses || []);
          
          if (data.storeProfile) {
            setStoreProfile(data.storeProfile);
            setCurrentUser(prev => prev ? { ...prev, storeName: data.storeProfile.name } : null);
          }
          setIsDataLoaded(true);
        }
      }, (error) => console.error("Sync error:", error));
    }

    return () => { if (unsubscribeSnapshot) unsubscribeSnapshot(); };
  }, [isAuthenticated, currentUser?.id]); 

  // --- 4. ACTIONS ---
  
  const saveToCloud = async (newData: any) => {
    if (isFirebaseConfigured && db && currentUser) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      // Use setDoc with merge:true to ensure it works even if doc doesn't exist
      await setDoc(userStoreRef, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
    }
  };

  const addVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ vehicles: [v, ...vehicles] });
    else setVehicles(prev => [v, ...prev]);
  };

  const updateVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ vehicles: vehicles.map(item => item.id === v.id ? v : item) });
    else setVehicles(prev => prev.map(item => item.id === v.id ? v : item));
  };

  const removeVehicle = async (id: string) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ vehicles: vehicles.filter(v => v.id !== id) });
    else setVehicles(prev => prev.filter(v => v.id !== id));
  };
  
  const addCustomer = async (c: Customer) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ customers: [c, ...customers] });
    else setCustomers(prev => [c, ...prev]);
  };

  const removeCustomer = async (id: string) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ customers: customers.filter(c => c.id !== id) });
    else setCustomers(prev => prev.filter(c => c.id !== id));
  };
  
  const addSale = async (s: Sale) => {
    if (isFirebaseConfigured && db && auth?.currentUser) {
      await saveToCloud({ 
          sales: [s, ...sales], 
          vehicles: vehicles.map(v => v.id === s.vehicleId ? { ...v, status: VehicleStatus.SOLD } : v) 
      });
    } else {
      setSales(prev => [s, ...prev]);
      setVehicles(prev => prev.map(v => v.id === s.vehicleId ? { ...v, status: VehicleStatus.SOLD } : v));
    }
  };

  const addExpense = async (e: Expense) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ expenses: [e, ...expenses] });
    else setExpenses(prev => [e, ...prev]);
  };

  const removeExpense = async (id: string) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ expenses: expenses.filter(e => e.id !== id) });
    else setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateStoreProfile = async (p: StoreProfile) => {
    if (isFirebaseConfigured && db && auth?.currentUser) await saveToCloud({ storeProfile: p });
    else setStoreProfile(p);
  };
  
  // --- AUTH ---

  const login = async (email: string, password: string): Promise<boolean> => {
    let firebaseError = null;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Tenta Firebase (se configurado)
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        return true;
      } catch (err: any) {
        console.warn("Login Firebase falhou, tentando local...", err.code);
        firebaseError = err;
        // NÃO LANÇA ERRO AINDA! Tenta o login local abaixo.
      }
    }

    // 2. Fallback: Tenta Login Local (para usuários antigos ou offline)
    const localUser = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword);
    if (localUser) {
      console.log("Login local bem sucedido.");
      setCurrentUser(localUser);
      setIsAuthenticated(true);
      const storageKey = `${DATA_STORAGE_PREFIX}${localUser.id}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const d = JSON.parse(savedData);
        setVehicles(d.vehicles || []); setCustomers(d.customers || []);
        setSales(d.sales || []); setExpenses(d.expenses || []);
        setStoreProfile(d.storeProfile || EMPTY_STORE_PROFILE);
        setIsDataLoaded(true);
      } else {
        initializeEmptyState(localUser.storeName, localUser.email);
      }
      return true;
    }

    // 3. Se ambos falharem, lança o erro original do Firebase ou um genérico
    if (firebaseError) {
      throw firebaseError;
    }
    
    return false;
  };

  const register = async (userData: Omit<User, 'id'>, accessCode: string): Promise<boolean> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPassword = userData.password.trim();

    // Validação da Chave de Acesso
    if (accessCode !== 'Auto12@') {
      const error: any = new Error("Código de acesso incorreto.");
      error.code = 'auth/invalid-access-code';
      throw error;
    }

    // --- CRIAÇÃO DO USUÁRIO ---
    
    if (isFirebaseConfigured && auth && db) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const firebaseUser = userCredential.user;
        
        const initialProfile: StoreProfile = { 
          name: userData.storeName, 
          email: cleanEmail, 
          phone: '', 
          targetMargin: 20 
        };

        // Criar perfil da loja
        // Verificamos se há dados locais para migrar
        let initialData = {
           vehicles: [], customers: [], sales: [], expenses: [],
           storeProfile: initialProfile,
           createdAt: new Date().toISOString(),
           role: 'user'
        };

        // Tenta migrar dados locais se for o mesmo email
        const localUser = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (localUser) {
           const storageKey = `${DATA_STORAGE_PREFIX}${localUser.id}`;
           const savedData = localStorage.getItem(storageKey);
           if (savedData) {
               const parsed = JSON.parse(savedData);
               initialData = { ...initialData, ...parsed, storeProfile: initialProfile };
           }
        }

        await setDoc(doc(db, 'stores', firebaseUser.uid), initialData, { merge: true });
        
        return true;
      } catch (err: any) {
        if (err.code !== 'auth/email-already-in-use') {
            console.error("Erro registro Firebase:", err);
        }
        throw err;
      }
    } else {
      // Local Registration
      const newUser: User = { 
        ...userData, 
        email: cleanEmail,
        password: cleanPassword,
        id: Date.now().toString(), 
        role: 'user' 
      };
      
      // Validação local com formato de erro compatível com Firebase para o UI
      if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
        const error: any = new Error("Email já cadastrado localmente.");
        error.code = 'auth/email-already-in-use';
        throw error;
      }
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      
      initializeEmptyState(newUser.storeName, newUser.email);
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      return true;
    }
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured && auth) {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
    } else {
        throw new Error("Recuperação de senha disponível apenas no modo Online.");
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try { await signOut(auth); } catch (e) { console.error(e); }
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsDataLoaded(false);
    setVehicles([]); setCustomers([]); setSales([]); setExpenses([]);
    setStoreProfile(EMPTY_STORE_PROFILE);
  };

  const getDataForExport = (): string => {
    if (!currentUser) return '{}';
    const data = {
      vehicles, customers, sales, expenses, storeProfile,
      user: { email: currentUser.email, storeName: currentUser.storeName },
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  };

  const exportData = () => {
    const jsonString = getDataForExport();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_autocars_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (isFirebaseConfigured && db && currentUser) {
          saveToCloud({
              vehicles: data.vehicles || [],
              customers: data.customers || [],
              sales: data.sales || [],
              expenses: data.expenses || [],
              storeProfile: data.storeProfile || storeProfile
          });
      } else {
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.customers) setCustomers(data.customers);
          if (data.sales) setSales(data.sales);
          if (data.expenses) setExpenses(data.expenses);
          if (data.storeProfile) setStoreProfile(data.storeProfile);
      }
      return true;
    } catch (e) {
      console.error("Erro import:", e);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ 
      vehicles, customers, sales, expenses, storeProfile, isAuthenticated, currentUser,
      isCloudSyncing: isFirebaseConfigured && !!db && !!auth?.currentUser, // Only show cloud syncing if auth matches
      addVehicle, updateVehicle, removeVehicle, addCustomer, removeCustomer, addSale, addExpense, removeExpense, updateStoreProfile,
      login, register, resetPassword, logout, exportData, getDataForExport, importData
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
