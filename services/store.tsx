
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Customer, Sale, Expense, VehicleStatus, FuelType, StoreProfile, User } from '../types';

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
  isCloudSyncing: boolean; // Mantido como false sempre
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
  // --- ESTADO GLOBAL (LOCAL ONLY) ---
  
  // Lista de Usuários (simulando banco de dados de auth local)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return savedUsers ? JSON.parse(savedUsers) : [];
    } catch { return []; }
  });
  
  // Sessão Atual
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedSession = localStorage.getItem('autocars_current_session');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch { return null; }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!currentUser);
  
  // Dados da Loja
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(EMPTY_STORE_PROFILE);

  // --- CARREGAMENTO DE DADOS (LOAD) ---
  useEffect(() => {
    if (currentUser) {
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const d = JSON.parse(savedData);
          setVehicles(d.vehicles || []);
          setCustomers(d.customers || []);
          setSales(d.sales || []);
          setExpenses(d.expenses || []);
          setStoreProfile(d.storeProfile || { ...EMPTY_STORE_PROFILE, name: currentUser.storeName, email: currentUser.email });
        } else {
          // Novo usuário sem dados
          setVehicles([]);
          setCustomers([]);
          setSales([]);
          setExpenses([]);
          setStoreProfile({ ...EMPTY_STORE_PROFILE, name: currentUser.storeName, email: currentUser.email });
        }
      } catch (e) {
        console.error("Erro ao carregar dados locais:", e);
      }
    }
  }, [currentUser]);

  // --- PERSISTÊNCIA DE DADOS (SAVE) ---
  useEffect(() => {
    if (currentUser) {
      const dataToSave = {
        vehicles, customers, sales, expenses, storeProfile, lastUpdated: new Date().toISOString()
      };
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser]);

  // --- PERSISTÊNCIA DE SESSÃO ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('autocars_current_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('autocars_current_session');
    }
  }, [currentUser]);


  // --- CRUD ACTIONS (LOCAL) ---

  const addVehicle = async (v: Vehicle) => setVehicles(prev => [v, ...prev]);
  const updateVehicle = async (v: Vehicle) => setVehicles(prev => prev.map(item => item.id === v.id ? v : item));
  const removeVehicle = async (id: string) => setVehicles(prev => prev.filter(v => v.id !== id));
  
  const addCustomer = async (c: Customer) => setCustomers(prev => [c, ...prev]);
  const removeCustomer = async (id: string) => setCustomers(prev => prev.filter(c => c.id !== id));
  
  const addSale = async (s: Sale) => {
    setSales(prev => [s, ...prev]);
    // Atualiza status do veículo
    setVehicles(prev => prev.map(v => v.id === s.vehicleId ? { ...v, status: VehicleStatus.SOLD } : v));
  };

  const addExpense = async (e: Expense) => setExpenses(prev => [e, ...prev]);
  const removeExpense = async (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const updateStoreProfile = async (p: StoreProfile) => {
    setStoreProfile(p);
    // Atualiza nome da loja no usuário também
    if (currentUser) {
        const updatedUser = { ...currentUser, storeName: p.name };
        setCurrentUser(updatedUser);
        const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedUser : u);
        setUsers(updatedUsersList);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsersList));
    }
  };
  
  // --- AUTH FLOWS (LOCAL ONLY) ---

  const login = async (email: string, password: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const localUser = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword);
    
    if (localUser) {
      console.log("Login local bem sucedido.");
      setCurrentUser(localUser);
      setIsAuthenticated(true);
      return true;
    }
    
    return false;
  };

  const register = async (userData: Omit<User, 'id'>, accessCode: string): Promise<boolean> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPassword = userData.password.trim();

    // Validação Opcional: Se você quiser travar o cadastro sem código, descomente abaixo.
    // O usuário pediu "deixe como estava", o que pode implicar que o código era necessário.
    if (accessCode !== 'Auto12@') {
       const error: any = new Error("Código de acesso incorreto.");
       error.code = 'auth/invalid-access-code';
       throw error;
    }

    if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
      const error: any = new Error("Email já cadastrado.");
      error.code = 'auth/email-already-in-use';
      throw error;
    }

    const newUser: User = { 
        ...userData, 
        email: cleanEmail,
        password: cleanPassword,
        id: Date.now().toString(), 
        role: 'user' 
    };
      
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      
    // Auto-login após registro
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    setStoreProfile({ ...EMPTY_STORE_PROFILE, name: newUser.storeName, email: newUser.email });
    
    return true;
  };

  const resetPassword = async (email: string) => {
    // Em modo puramente local sem backend, não é possível enviar email real.
    // Apenas simulamos um sucesso ou erro.
    const userExists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (userExists) {
        alert(`MODO LOCAL: A senha para ${email} é "${userExists.password}". (Em produção real isso enviaria um email)`);
    } else {
        throw new Error("Email não encontrado na base local.");
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setVehicles([]); setCustomers([]); setSales([]); setExpenses([]);
    setStoreProfile(EMPTY_STORE_PROFILE);
    localStorage.removeItem('autocars_current_session');
  };

  // --- IMPORT/EXPORT (BACKUP MANUAL) ---

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
      if (data.vehicles) setVehicles(data.vehicles);
      if (data.customers) setCustomers(data.customers);
      if (data.sales) setSales(data.sales);
      if (data.expenses) setExpenses(data.expenses);
      if (data.storeProfile) updateStoreProfile(data.storeProfile);
      return true;
    } catch (e) {
      console.error("Erro import:", e);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ 
      vehicles, customers, sales, expenses, storeProfile, isAuthenticated, currentUser,
      isCloudSyncing: false, // Sempre false no modo local
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
