
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
const LICENSES_STORAGE_KEY = 'autocars_licenses';
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
          // Busca role e storeName do Firestore
          let role: 'admin' | 'user' = 'user';
          let storeName = '';
          
          if (db) {
             const userDoc = await getDoc(doc(db, 'stores', firebaseUser.uid));
             if (userDoc.exists()) {
                 const d = userDoc.data();
                 storeName = d.storeProfile?.name || '';
                 role = d.role || 'user';
             }
          }

          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            password: '', 
            storeName,
            role
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
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
      });
      return () => unsubscribeAuth();
    }
  }, []);

  // --- 3. SINCRONIZAÇÃO DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    if (isAuthenticated && currentUser && isFirebaseConfigured && db) {
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
            setCurrentUser(prev => prev ? { ...prev, storeName: data.storeProfile.name, role: data.role || prev.role } : null);
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
      await updateDoc(userStoreRef, { ...newData, lastUpdated: new Date().toISOString() });
    }
  };

  const addVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db) await saveToCloud({ vehicles: [v, ...vehicles] });
    else setVehicles(prev => [v, ...prev]);
  };

  const updateVehicle = async (v: Vehicle) => {
    if (isFirebaseConfigured && db) await saveToCloud({ vehicles: vehicles.map(item => item.id === v.id ? v : item) });
    else setVehicles(prev => prev.map(item => item.id === v.id ? v : item));
  };

  const removeVehicle = async (id: string) => {
    if (isFirebaseConfigured && db) await saveToCloud({ vehicles: vehicles.filter(v => v.id !== id) });
    else setVehicles(prev => prev.filter(v => v.id !== id));
  };
  
  const addCustomer = async (c: Customer) => {
    if (isFirebaseConfigured && db) await saveToCloud({ customers: [c, ...customers] });
    else setCustomers(prev => [c, ...prev]);
  };

  const removeCustomer = async (id: string) => {
    if (isFirebaseConfigured && db) await saveToCloud({ customers: customers.filter(c => c.id !== id) });
    else setCustomers(prev => prev.filter(c => c.id !== id));
  };
  
  const addSale = async (s: Sale) => {
    if (isFirebaseConfigured && db) {
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
    if (isFirebaseConfigured && db) await saveToCloud({ expenses: [e, ...expenses] });
    else setExpenses(prev => [e, ...prev]);
  };

  const removeExpense = async (id: string) => {
    if (isFirebaseConfigured && db) await saveToCloud({ expenses: expenses.filter(e => e.id !== id) });
    else setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateStoreProfile = async (p: StoreProfile) => {
    if (isFirebaseConfigured && db) await saveToCloud({ storeProfile: p });
    else setStoreProfile(p);
  };
  
  // --- AUTH ---

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (err: any) {
        console.error("Login Error:", err);
        throw err; 
      }
    }

    const localUser = users.find(u => u.email === email && u.password === password);
    if (localUser) {
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
    return false;
  };

  const register = async (userData: Omit<User, 'id'>, accessCode: string): Promise<boolean> => {
    let role: 'admin' | 'user' = 'user';
    let isLicenseValid = false;

    // 1. Verificar Chave Mestra
    if (accessCode === 'SAAS-MASTER-ADMIN') {
        role = 'admin';
        isLicenseValid = true;
    } 
    // 2. Verificar Legado
    else if (accessCode === 'Auto12@') {
        role = 'user';
        isLicenseValid = true;
    }
    // 3. Verificar Licença Dinâmica (Firestore)
    else if (isFirebaseConfigured && db) {
        try {
            const licenseRef = doc(db, 'licenses', accessCode);
            const licenseSnap = await getDoc(licenseRef);
            
            if (licenseSnap.exists() && licenseSnap.data().status === 'available') {
                isLicenseValid = true;
                // Marcar como usada será feito após criar o user com sucesso para evitar inconsistência
            }
        } catch (e) {
            console.error("Erro validação licença:", e);
        }
    }
    // 4. Verificar Licença Local (LocalStorage)
    else {
         const localLicenses = JSON.parse(localStorage.getItem(LICENSES_STORAGE_KEY) || '[]');
         const lic = localLicenses.find((l: any) => l.key === accessCode && l.status === 'available');
         if (lic) isLicenseValid = true;
    }

    if (!isLicenseValid) {
        throw new Error("Código de acesso ou licença inválida.");
    }

    // --- CRIAÇÃO DO USUÁRIO ---
    
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

        // Criar perfil da loja
        await setDoc(doc(db, 'stores', firebaseUser.uid), {
          vehicles: [], customers: [], sales: [], expenses: [],
          storeProfile: initialProfile,
          createdAt: new Date().toISOString(),
          role: role
        });

        // Se foi usada uma licença do banco, marcar como usada
        if (role === 'user' && accessCode !== 'Auto12@') {
             await updateDoc(doc(db, 'licenses', accessCode), {
                 status: 'used',
                 usedBy: firebaseUser.uid,
                 usedAt: new Date().toISOString(),
                 storeName: userData.storeName
             });
        }
        
        return true;
      } catch (err: any) {
        console.error("Erro registro Firebase:", err);
        throw err;
      }
    } else {
      // Local Registration
      const newUser: User = { ...userData, id: Date.now().toString(), role };
      if (users.find(u => u.email === userData.email)) throw new Error("Email já cadastrado.");
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      
      // Update local license if used
      if (role === 'user' && accessCode !== 'Auto12@') {
          const localLicenses = JSON.parse(localStorage.getItem(LICENSES_STORAGE_KEY) || '[]');
          const updatedLicenses = localLicenses.map((l: any) => 
              l.key === accessCode ? { ...l, status: 'used', usedBy: newUser.id, usedAt: new Date().toISOString() } : l
          );
          localStorage.setItem(LICENSES_STORAGE_KEY, JSON.stringify(updatedLicenses));
      }

      initializeEmptyState(newUser.storeName, newUser.email);
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      return true;
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
      isCloudSyncing: isFirebaseConfigured && !!db,
      addVehicle, updateVehicle, removeVehicle, addCustomer, removeCustomer, addSale, addExpense, removeExpense, updateStoreProfile,
      login, register, logout, exportData, getDataForExport, importData
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
