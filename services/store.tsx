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
  isCloudSyncing: boolean; // New state to show sync status
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (v: Vehicle) => void;
  removeVehicle: (id: string) => void;
  addCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  addSale: (s: Sale) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
  updateStoreProfile: (p: StoreProfile) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (user: Omit<User, 'id'>) => Promise<boolean>;
  logout: () => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local User Cache (for when offline/local mode)
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

  // --- HELPER: INITIALIZE EMPTY ---
  const initializeEmptyData = (user: User) => {
     setVehicles([]);
     setCustomers([]);
     setSales([]);
     setExpenses([]);
     setStoreProfile({
       name: user.storeName,
       email: user.email,
       phone: '',
       targetMargin: 20
     });
     setIsDataLoaded(true);
  };

  // --- PERSISTÊNCIA & SINCRONIZAÇÃO ---

  // 1. Sync Changes TO Storage (Cloud or Local)
  useEffect(() => {
    if (currentUser && isAuthenticated && isDataLoaded) {
      const dataToSave = {
        vehicles,
        customers,
        sales,
        expenses,
        storeProfile,
        lastUpdated: new Date().toISOString()
      };

      if (isFirebaseConfigured && db) {
        // CLOUD SAVE (Debounced slightly in real apps, but direct here for simplicity)
        const userStoreRef = doc(db, 'stores', currentUser.id);
        // We use setDoc with merge to avoid overwriting if fields missing, but here we want full state sync
        setDoc(userStoreRef, dataToSave, { merge: true }).catch(err => console.error("Cloud Save Error:", err));
      } else {
        // LOCAL SAVE
        const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      }
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated, isDataLoaded]);

  // 2. Real-time Listeners FROM Cloud
  useEffect(() => {
    let unsubscribe: () => void;

    if (isAuthenticated && currentUser && isFirebaseConfigured && db) {
      console.log("[AutoCars Sync] Conectando ao Firestore...");
      const userStoreRef = doc(db, 'stores', currentUser.id);
      
      unsubscribe = onSnapshot(userStoreRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("[AutoCars Sync] Atualização recebida da Nuvem.");
          // Only update state if data is different/newer to avoid loops (simplified here)
          // In a real robust app, we'd check timestamps.
          setVehicles(data.vehicles || []);
          setCustomers(data.customers || []);
          setSales(data.sales || []);
          setExpenses(data.expenses || []);
          if (data.storeProfile) setStoreProfile(data.storeProfile);
          setIsDataLoaded(true);
        } else {
          // Document doesn't exist yet on cloud, create it from current empty state
          console.log("[AutoCars Sync] Loja não encontrada na nuvem. Criando...");
          setDoc(userStoreRef, {
            vehicles: [], customers: [], sales: [], expenses: [],
            storeProfile: { name: currentUser.storeName, email: currentUser.email, phone: '', targetMargin: 20 },
            createdAt: new Date().toISOString()
          });
          setIsDataLoaded(true);
        }
      }, (error) => {
        console.error("Erro na sincronização:", error);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, currentUser]);

  // --- ACTIONS ---

  const addVehicle = (v: Vehicle) => setVehicles(prev => [v, ...prev]);
  const updateVehicle = (v: Vehicle) => setVehicles(prev => prev.map(item => item.id === v.id ? v : item));
  const removeVehicle = (id: string) => setVehicles(prev => prev.filter(v => v.id !== id));
  
  const addCustomer = (c: Customer) => setCustomers(prev => [c, ...prev]);
  const removeCustomer = (id: string) => setCustomers(prev => prev.filter(c => c.id !== id));
  
  const addSale = (s: Sale) => {
    setSales(prev => [s, ...prev]);
    const vehicle = vehicles.find(v => v.id === s.vehicleId);
    if (vehicle) {
      updateVehicle({ ...vehicle, status: VehicleStatus.SOLD });
    }
  };
  const addExpense = (e: Expense) => setExpenses(prev => [e, ...prev]);
  const removeExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const updateStoreProfile = (p: StoreProfile) => setStoreProfile(p);
  
  // --- AUTHENTICATION ---

  const login = async (email: string, password: string): Promise<boolean> => {
    // 1. Check Cloud Auth (Simulated using Users Collection)
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
        }
      } catch (err) {
        console.error("Erro no login nuvem:", err);
      }
    }

    // 2. Fallback to Local Auth
    const localUser = users.find(u => u.email === email && u.password === password);
    if (localUser) {
      setCurrentUser(localUser);
      setIsAuthenticated(true);
      
      // Load Local Data
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
          initializeEmptyData(localUser);
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
          storeProfile: { name: userData.storeName, email: userData.email, phone: '', targetMargin: 20 }
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
      initializeEmptyData(newUser);
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
      if (data.vehicles && Array.isArray(data.vehicles)) setVehicles(data.vehicles);
      if (data.customers && Array.isArray(data.customers)) setCustomers(data.customers);
      if (data.sales && Array.isArray(data.sales)) setSales(data.sales);
      if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (data.storeProfile) setStoreProfile(data.storeProfile);
      return true;
    } catch (e) {
      console.error("Erro na importação:", e);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ 
      vehicles, customers, sales, expenses, storeProfile, isAuthenticated, currentUser,
      isCloudSyncing: isFirebaseConfigured,
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