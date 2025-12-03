
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Customer, Sale, Expense, VehicleStatus, FuelType, StoreProfile, User } from '../types';
import { db, isFirebaseConfigured } from './firebase';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

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

  // --- 2. SINCRONIZAÇÃO EM TEMPO REAL (CLOUD LISTENER) ---
  // Esta é a única fonte de verdade quando conectado à nuvem.
  useEffect(() => {
    let unsubscribe: () => void;

    if (isAuthenticated && currentUser && isFirebaseConfigured && db) {
      console.log("[AutoCars Sync] Conectando ao Firestore...");
      const userStoreRef = doc(db, 'stores', currentUser.id);
      
      unsubscribe = onSnapshot(userStoreRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Recebe dados da nuvem e atualiza a tela imediatamente
          setVehicles(data.vehicles || []);
          setCustomers(data.customers || []);
          setSales(data.sales || []);
          setExpenses(data.expenses || []);
          if (data.storeProfile) setStoreProfile(data.storeProfile);
          setIsDataLoaded(true);
        } else {
          // Se o documento não existe na nuvem (primeiro acesso real), cria um vazio
          console.log("[AutoCars Sync] Inicializando loja na nuvem...");
          setDoc(userStoreRef, {
            vehicles: [], customers: [], sales: [], expenses: [],
            storeProfile: { name: currentUser.storeName, email: currentUser.email, phone: '', targetMargin: 20 },
            createdAt: new Date().toISOString()
          });
          initializeEmptyState(currentUser.storeName, currentUser.email);
        }
      }, (error) => {
        console.error("Erro crítico na sincronização:", error);
        alert("Erro de conexão com o banco de dados. Verifique sua internet ou as chaves de API.");
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, currentUser]);

  // --- 3. ACTIONS (WRITE TO CLOUD OR LOCAL) ---
  
  // Helper para salvar no banco
  const saveToCloud = async (newData: any) => {
    if (isFirebaseConfigured && db && currentUser) {
      const userStoreRef = doc(db, 'stores', currentUser.id);
      await updateDoc(userStoreRef, { ...newData, lastUpdated: new Date().toISOString() });
    }
  };

  const addVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db) {
      // Cloud Mode: Envia para o banco, o onSnapshot atualizará a tela
      const newVehicles = [v, ...vehicles];
      await saveToCloud({ vehicles: newVehicles });
    } else {
      // Local Mode
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
      // Também atualiza o status do veículo para vendido
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
    // 1. Check Cloud Auth
    if (isFirebaseConfigured && db) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email), where("password", "==", password));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data() as User;
          setCurrentUser(userData);
          setIsAuthenticated(true);
          return true;
        } else {
            console.log("Usuário não encontrado no Firebase com essas credenciais.");
            return false;
        }
      } catch (err) {
        console.error("Erro no login nuvem:", err);
        alert("Erro ao conectar ao servidor. Verifique o console.");
        return false;
      }
    }

    // 2. Fallback to Local Auth
    const localUser = users.find(u => u.email === email && u.password === password);
    if (localUser) {
      setCurrentUser(localUser);
      setIsAuthenticated(true);
      
      // Load Local Data if Cloud is NOT available
      if (!isFirebaseConfigured) {
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
      }
      return true;
    }

    return false;
  };

  const register = async (userData: Omit<User, 'id'>): Promise<boolean> => {
    const newUser: User = { ...userData, id: Date.now().toString() };

    // 1. Register in Cloud
    if (isFirebaseConfigured && db) {
      try {
        // Check if exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", userData.email));
        const snap = await getDocs(q);
        if (!snap.empty) return false;

        // Save User
        await setDoc(doc(db, 'users', newUser.id), newUser);
        
        // Initialize Store Data
        await setDoc(doc(db, 'stores', newUser.id), {
          vehicles: [], customers: [], sales: [], expenses: [],
          storeProfile: { name: userData.storeName, email: userData.email, phone: '', targetMargin: 20 },
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Erro registro nuvem:", err);
        return false;
      }
    } else {
      // Register Local
      if (users.find(u => u.email === userData.email)) return false;
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      initializeEmptyState(newUser.storeName, newUser.email);
    }
    
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
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
      // If connected to cloud, save imported data to cloud
      if (isFirebaseConfigured && db && currentUser) {
          saveToCloud({
              vehicles: data.vehicles || [],
              customers: data.customers || [],
              sales: data.sales || [],
              expenses: data.expenses || [],
              storeProfile: data.storeProfile || storeProfile
          });
      } else {
          // Local update
          if (data.vehicles && Array.isArray(data.vehicles)) setVehicles(data.vehicles);
          if (data.customers && Array.isArray(data.customers)) setCustomers(data.customers);
          if (data.sales && Array.isArray(data.sales)) setSales(data.sales);
          if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
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
