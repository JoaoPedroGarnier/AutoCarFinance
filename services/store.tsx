
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Customer, Sale, Expense, VehicleStatus, FuelType, StoreProfile, User } from '../types';
import { db, auth, isFirebaseConfigured } from './firebase';
import { doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  AuthError
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
  register: (user: Omit<User, 'id'>) => Promise<boolean>;
  logout: () => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local User Cache (for offline/local mode fallback)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return savedUsers ? JSON.parse(savedUsers) : [];
    } catch (error) {
      console.error("Erro ao carregar usuários locais:", error);
      return [];
    }
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

  // --- 1. PERSISTÊNCIA LOCAL (FALLBACK APENAS) ---
  // Só salva no LocalStorage se NÃO estiver usando a nuvem.
  useEffect(() => {
    if (currentUser && isAuthenticated && isDataLoaded && (!isFirebaseConfigured || !db)) {
      const dataToSave = {
        vehicles,
        customers,
        sales,
        expenses,
        storeProfile,
        lastUpdated: new Date().toISOString()
      };
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated, isDataLoaded]);

  // --- 2. GERENCIAMENTO DE SESSÃO FIREBASE (AUTH LISTENER) ---
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      // Forçar persistência local para garantir que o celular mantenha o login
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
           console.log("[AutoCars Auth] Persistência configurada.");
        })
        .catch((error) => {
           console.error("[AutoCars Auth] Erro na persistência:", error);
        });

      const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Usuário detectado (Login persistente ou novo login)
          console.log("[AutoCars Auth] Usuário conectado:", firebaseUser.email);
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            password: '', // Não armazenamos senha localmente com Firebase Auth
            storeName: '' // Será carregado do Firestore
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          // Logout detectado
          console.log("[AutoCars Auth] Usuário desconectado");
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsDataLoaded(false);
          setVehicles([]);
          setCustomers([]);
          setSales([]);
          setExpenses([]);
          setStoreProfile(EMPTY_STORE_PROFILE);
        }
      });
      return () => unsubscribeAuth();
    }
  }, []);

  // --- 3. SINCRONIZAÇÃO DE DADOS EM TEMPO REAL (FIRESTORE) ---
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    if (isAuthenticated && currentUser && isFirebaseConfigured && db) {
      console.log("[AutoCars Sync] Conectando ao Firestore para usuário:", currentUser.id);
      const userStoreRef = doc(db, 'stores', currentUser.id);
      
      unsubscribeSnapshot = onSnapshot(userStoreRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Recebe dados da nuvem e atualiza a tela imediatamente
          setVehicles(data.vehicles || []);
          setCustomers(data.customers || []);
          setSales(data.sales || []);
          setExpenses(data.expenses || []);
          
          if (data.storeProfile) {
            setStoreProfile(data.storeProfile);
            // Atualiza o nome da loja no estado do usuário para a UI
            setCurrentUser(prev => prev ? { ...prev, storeName: data.storeProfile.name } : null);
          }
          setIsDataLoaded(true);
        } else {
          // Se estamos logados no Auth mas não tem dados no Firestore (ex: erro no registro anterior),
          // inicializamos o documento.
          console.log("[AutoCars Sync] Perfil não encontrado no banco de dados.");
        }
      }, (error) => {
        console.error("Erro crítico na sincronização:", error);
        // Não mostrar alert intrusivo aqui para não bloquear a UI em reconexões
      });
    }

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [isAuthenticated, currentUser?.id]); 

  // --- 4. ACTIONS (WRITE TO CLOUD OR LOCAL) ---
  
  const saveToCloud = async (newData: any) => {
    if (isFirebaseConfigured && db && currentUser) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      await updateDoc(userStoreRef, { ...newData, lastUpdated: new Date().toISOString() });
    }
  };

  const addVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db) {
      const newVehicles = [v, ...vehicles];
      await saveToCloud({ vehicles: newVehicles });
    } else {
      setVehicles(prev => [v, ...prev]);
    }
  };

  const updateVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db) {
      const newVehicles = vehicles.map(item => item.id === v.id ? v : item);
      await saveToCloud({ vehicles: newVehicles });
    } else {
      setVehicles(prev => prev.map(item => item.id === v.id ? v : item));
    }
  };

  const removeVehicle = async (id: string) => {
    if (isFirebaseConfigured && db) {
      const newVehicles = vehicles.filter(v => v.id !== id);
      await saveToCloud({ vehicles: newVehicles });
    } else {
      setVehicles(prev => prev.filter(v => v.id !== id));
    }
  };
  
  const addCustomer = async (c: Customer) => {
    if (isFirebaseConfigured && db) {
      const newCustomers = [c, ...customers];
      await saveToCloud({ customers: newCustomers });
    } else {
      setCustomers(prev => [c, ...prev]);
    }
  };

  const removeCustomer = async (id: string) => {
    if (isFirebaseConfigured && db) {
      const newCustomers = customers.filter(c => c.id !== id);
      await saveToCloud({ customers: newCustomers });
    } else {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };
  
  const addSale = async (s: Sale) => {
    if (isFirebaseConfigured && db) {
      const newSales = [s, ...sales];
      const newVehicles = vehicles.map(v => v.id === s.vehicleId ? { ...v, status: VehicleStatus.SOLD } : v);
      await saveToCloud({ sales: newSales, vehicles: newVehicles });
    } else {
      setSales(prev => [s, ...prev]);
      setVehicles(prev => prev.map(v => v.id === s.vehicleId ? { ...v, status: VehicleStatus.SOLD } : v));
    }
  };

  const addExpense = async (e: Expense) => {
    if (isFirebaseConfigured && db) {
      const newExpenses = [e, ...expenses];
      await saveToCloud({ expenses: newExpenses });
    } else {
      setExpenses(prev => [e, ...prev]);
    }
  };

  const removeExpense = async (id: string) => {
    if (isFirebaseConfigured && db) {
      const newExpenses = expenses.filter(e => e.id !== id);
      await saveToCloud({ expenses: newExpenses });
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateStoreProfile = async (p: StoreProfile) => {
    if (isFirebaseConfigured && db) {
      await saveToCloud({ storeProfile: p });
    } else {
      setStoreProfile(p);
    }
  };
  
  // --- AUTHENTICATION ---

  const login = async (email: string, password: string): Promise<boolean> => {
    // 1. Firebase Auth (Prioridade)
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (err: any) {
        console.error("Erro no login Firebase:", err);
        throw err; 
      }
    }

    // 2. Fallback to Local Auth (Modo Offline/Sem Config)
    const localUser = users.find(u => u.email === email && u.password === password);
    if (localUser) {
      setCurrentUser(localUser);
      setIsAuthenticated(true);
      
      const storageKey = `${DATA_STORAGE_PREFIX}${localUser.id}`;
      const savedDataString = localStorage.getItem(storageKey);
      if (savedDataString) {
        const userData = JSON.parse(savedDataString);
        setVehicles(userData.vehicles || []);
        setCustomers(userData.customers || []);
        setSales(userData.sales || []);
        setExpenses(userData.expenses || []);
        setStoreProfile(userData.storeProfile || EMPTY_STORE_PROFILE);
        setIsDataLoaded(true);
      } else {
        initializeEmptyState(localUser.storeName, localUser.email);
      }
      return true;
    }

    return false;
  };

  const register = async (userData: Omit<User, 'id'>): Promise<boolean> => {
    // 1. Firebase Auth Registration
    if (isFirebaseConfigured && auth && db) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const firebaseUser = userCredential.user;
        
        const initialProfile: StoreProfile = { 
          name: userData.storeName, 
          email: userData.email, 
          phone: '', 
          targetMargin: 20 
        };

        await setDoc(doc(db, 'stores', firebaseUser.uid), {
          vehicles: [], customers: [], sales: [], expenses: [],
          storeProfile: initialProfile,
          createdAt: new Date().toISOString()
        });
        
        return true;
      } catch (err: any) {
        console.error("Erro registro Firebase:", err);
        throw err;
      }
    } else {
      // Register Local
      const newUser: User = { ...userData, id: Date.now().toString() };
      if (users.find(u => u.email === userData.email)) return false;
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      initializeEmptyState(newUser.storeName, newUser.email);
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      return true;
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Erro ao sair:", e);
      }
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsDataLoaded(false);
    setVehicles([]);
    setCustomers([]);
    setSales([]);
    setExpenses([]);
    setStoreProfile(EMPTY_STORE_PROFILE);
  };

  // --- IMPORT/EXPORT ---
  const exportData = () => {
    if (!currentUser) return;
    const data = {
      vehicles, customers, sales, expenses, storeProfile,
      user: { email: currentUser.email, storeName: currentUser.storeName }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
      console.error("Erro na importação:", e);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ 
      vehicles, customers, sales, expenses, storeProfile, isAuthenticated, currentUser,
      isCloudSyncing: isFirebaseConfigured && !!db,
      addVehicle, updateVehicle, removeVehicle, addCustomer, removeCustomer, addSale, addExpense, removeExpense, updateStoreProfile,
      login, register, logout, exportData, importData
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
