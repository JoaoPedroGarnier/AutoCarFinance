
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

  // --- 1. PERSISTÊNCIA LOCAL (FALLBACK/OFFLINE ONLY) ---
  useEffect(() => {
    // Apenas salva no localStorage se NÃO estivermos conectados ao banco da nuvem
    // Isso evita conflitos de versões entre dispositivos
    const isCloudConnected = isFirebaseConfigured && db && auth?.currentUser;
    
    if (currentUser && isAuthenticated && isDataLoaded && !isCloudConnected) {
      const dataToSave = {
        vehicles, customers, sales, expenses, storeProfile, lastUpdated: new Date().toISOString()
      };
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated, isDataLoaded]);

  // --- 2. GERENCIAMENTO DE SESSÃO FIREBASE (MULTI-DEVICE CORE) ---
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      // Configura persistência para manter login ao fechar/abrir navegador
      setPersistence(auth, browserLocalPersistence).catch(console.error);

      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Usuário detectado (Login persistente ou novo login em outro dispositivo)
          console.log("[AutoCars] Usuário autenticado na nuvem:", firebaseUser.email);
          
          let storeName = '';
          
          // Tenta buscar o nome da loja imediatamente para melhor UX
          if (db) {
             try {
                 const userDoc = await getDoc(doc(db, 'stores', firebaseUser.uid));
                 if (userDoc.exists()) {
                     const d = userDoc.data();
                     storeName = d.storeProfile?.name || 'Minha Loja';
                 }
             } catch (e) {
                 console.warn("[AutoCars] Leitura de perfil inicial falhou (pode estar offline):", e);
             }
          }

          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            password: '', // Senha não é armazenada no estado por segurança
            storeName,
            role: 'user'
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          // Logout ou Sessão Expirada
          // Verificamos se há um usuário LOCAL antes de limpar tudo
          const isLocalSession = currentUser && users.some(u => u.id === currentUser.id && u.email === currentUser.email);
          
          if (!isLocalSession) {
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
  }, []); 

  // --- 3. SINCRONIZAÇÃO DE DADOS EM TEMPO REAL (SYNC) ---
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    // A mágica do multi-dispositivo acontece aqui:
    // O onSnapshot escuta mudanças no banco de dados.
    // Se você alterar algo no celular, o PC recebe a atualização em milissegundos.
    if (isAuthenticated && currentUser && isFirebaseConfigured && db && auth?.currentUser?.uid === currentUser.id) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      
      console.log("[AutoCars] 📡 Conectando ao banco de dados em tempo real...");
      
      unsubscribeSnapshot = onSnapshot(userStoreRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("[AutoCars] 🔄 Dados recebidos da nuvem.");
          const data = docSnap.data();
          
          // Atualização de estado segura
          setVehicles(data.vehicles || []);
          setCustomers(data.customers || []);
          setSales(data.sales || []);
          setExpenses(data.expenses || []);
          
          if (data.storeProfile) {
            setStoreProfile(data.storeProfile);
            // Atualiza nome da loja se mudou em outro dispositivo
            if (data.storeProfile.name !== currentUser.storeName) {
                setCurrentUser(prev => prev ? { ...prev, storeName: data.storeProfile.name } : null);
            }
          }
          setIsDataLoaded(true);
        } else {
          // Documento não existe (novo usuário ou erro de criação)
          console.log("[AutoCars] Documento da loja não encontrado. Inicializando novo perfil...");
          setIsDataLoaded(true); // Libera o app mesmo vazio
        }
      }, (error) => {
          console.error("[AutoCars] ❌ Erro de sincronização:", error);
          // Em caso de erro de permissão ou rede, mantemos os dados que já temos
          setIsDataLoaded(true); 
      });
    }

    return () => { if (unsubscribeSnapshot) unsubscribeSnapshot(); };
  }, [isAuthenticated, currentUser?.id]); 

  // --- 4. ACTIONS (Cloud First) ---
  
  const saveToCloud = async (newData: any) => {
    if (isFirebaseConfigured && db && currentUser) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      // setDoc com merge:true garante que se criarmos dados em um novo dispositivo, 
      // eles se juntam ao registro existente sem apagar nada.
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
  
  // --- AUTH FLOWS ---

  const login = async (email: string, password: string): Promise<boolean> => {
    let firebaseError = null;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Tenta Firebase (Nuvem) - Prioridade Máxima
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        return true; // Sucesso, o onAuthStateChanged lidará com o resto
      } catch (err: any) {
        console.warn("Login Firebase falhou:", err.code);
        firebaseError = err;
        
        // Se o erro for de credencial, não tentamos local, pois o usuário quer acessar a conta da nuvem
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
             // Verificamos se EXISTE uma conta local antes de falhar totalmente
             // Isso serve para usuários que ainda não migraram
             const localUser = users.find(u => u.email.toLowerCase() === cleanEmail);
             if (!localUser) {
                 throw err; // Se não tem local, é erro de senha da nuvem mesmo
             }
        }
      }
    }

    // 2. Fallback: Tenta Login Local (apenas se falhar conexão ou for usuário legado)
    const localUser = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword);
    if (localUser) {
      console.log("Login local bem sucedido (Modo Offline).");
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

    // 3. Se chegou aqui, falhou nuvem e local
    if (firebaseError) {
      throw firebaseError;
    }
    
    return false;
  };

  const register = async (userData: Omit<User, 'id'>, accessCode: string): Promise<boolean> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPassword = userData.password.trim();

    // Validação da Chave de Acesso (Requisitada pelo usuário)
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

        // Prepara dados iniciais
        let initialData = {
           vehicles: [], customers: [], sales: [], expenses: [],
           storeProfile: initialProfile,
           createdAt: new Date().toISOString(),
           role: 'user'
        };

        // Se o usuário já existia localmente, migramos os dados para a nuvem agora
        const localUser = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (localUser) {
           const storageKey = `${DATA_STORAGE_PREFIX}${localUser.id}`;
           const savedData = localStorage.getItem(storageKey);
           if (savedData) {
               console.log("Migrando dados locais para a nuvem durante o registro...");
               const parsed = JSON.parse(savedData);
               initialData = { ...initialData, ...parsed, storeProfile: initialProfile };
           }
        }

        // Cria o documento no Firestore
        await setDoc(doc(db, 'stores', firebaseUser.uid), initialData, { merge: true });
        
        return true;
      } catch (err: any) {
        // Se o email já existe, o Login.tsx lida com isso tentando logar
        if (err.code !== 'auth/email-already-in-use') {
            console.error("Erro registro Firebase:", err);
        }
        throw err;
      }
    } else {
      // Registro Local (apenas se a nuvem estiver inoperante)
      const newUser: User = { 
        ...userData, 
        email: cleanEmail,
        password: cleanPassword,
        id: Date.now().toString(), 
        role: 'user' 
      };
      
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
      isCloudSyncing: isFirebaseConfigured && !!db && !!auth?.currentUser, 
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
