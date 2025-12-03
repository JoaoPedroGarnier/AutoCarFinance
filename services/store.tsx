
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
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (v: Vehicle) => void;
  removeVehicle: (id: string) => void;
  addCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  addSale: (s: Sale) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
  updateStoreProfile: (p: StoreProfile) => void;
  login: (email: string, password: string) => boolean;
  register: (user: Omit<User, 'id'>) => boolean;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Carregar usuários registrados do Armazenamento ao iniciar
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return savedUsers ? JSON.parse(savedUsers) : [];
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      return [];
    }
  });
  
  // Estado da Sessão Atual
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // TRAVA DE SEGURANÇA: Impede que o useEffect de salvamento sobrescreva dados antes do carregamento completo
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Estados de Dados
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(EMPTY_STORE_PROFILE);

  // --- PERSISTÊNCIA: USUÁRIOS ---
  // Salva a lista de usuários sempre que um novo for registrado
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, [users]);

  // --- PERSISTÊNCIA: DADOS DA LOJA (Sync) ---
  // Salva os dados da loja atual SEMPRE que houver qualquer alteração
  // MAS APENAS SE os dados já tiverem sido carregados inicialmente (isDataLoaded)
  useEffect(() => {
    if (currentUser && isAuthenticated && isDataLoaded) {
      const storageKey = `${DATA_STORAGE_PREFIX}${currentUser.id}`;
      const dataToSave = {
        vehicles,
        customers,
        sales,
        expenses,
        storeProfile,
        lastUpdated: new Date().toISOString() // Metadata para controle de versão
      };
      
      console.log(`[AutoCars Sync] Salvando dados atualizados para usuário ${currentUser.id}...`);
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated, isDataLoaded]);

  // --- AÇÕES ---

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
  
  const login = (email: string, password: string): boolean => {
    // 1. Simular autenticação
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      console.log(`[AutoCars Auth] Usuário ${user.email} autenticado. Carregando armazenamento...`);
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // 2. Carregar Dados do Armazenamento Central (LocalStorage neste caso)
      const storageKey = `${DATA_STORAGE_PREFIX}${user.id}`;
      const savedDataString = localStorage.getItem(storageKey);
      
      if (savedDataString) {
        // Cenario A: Dados já existem. Carregar e Sincronizar.
        try {
          const userData = JSON.parse(savedDataString);
          console.log("[AutoCars Sync] Dados existentes encontrados. Carregando...");
          
          setVehicles(userData.vehicles || []);
          setCustomers(userData.customers || []);
          setSales(userData.sales || []);
          setExpenses(userData.expenses || []);
          setStoreProfile(userData.storeProfile || {
            name: user.storeName,
            email: user.email,
            phone: '',
            targetMargin: 20
          });
          
          // Libera a trava para permitir edições futuras
          setIsDataLoaded(true);
        } catch (e) {
          console.error("[AutoCars Sync] Erro Crítico: Dados corrompidos.", e);
          initializeEmptyData(user);
        }
      } else {
        // Cenario B: Primeiro acesso deste usuário (ou limpeza de cache). Inicializar.
        console.log("[AutoCars Sync] Nenhum dado encontrado. Inicializando novo banco de dados para a loja.");
        initializeEmptyData(user);
      }

      return true;
    }
    return false;
  };

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
     // Importante: Marcar como carregado para que o useEffect possa salvar a estrutura inicial
     setIsDataLoaded(true);
  };

  const register = (userData: Omit<User, 'id'>): boolean => {
    if (users.find(u => u.email === userData.email)) {
      return false; // Usuário já existe
    }
    
    const newUser: User = { ...userData, id: Date.now().toString() };
    
    // Atualiza lista de usuários
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    
    // Auto Login
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    
    // Inicializa estrutura de dados zerada
    initializeEmptyData(newUser);

    return true;
  };

  const logout = () => {
    console.log("[AutoCars Auth] Logout realizado. Limpando memória volátil.");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsDataLoaded(false); // Trava novamente
    // Limpar visualização por segurança (não apaga do localStorage)
    setVehicles([]);
    setCustomers([]);
    setSales([]);
    setExpenses([]);
    setStoreProfile(EMPTY_STORE_PROFILE);
  };

  return (
    <StoreContext.Provider value={{ 
      vehicles, customers, sales, expenses, storeProfile, isAuthenticated, currentUser,
      addVehicle, updateVehicle, removeVehicle, addCustomer, removeCustomer, addSale, addExpense, removeExpense, updateStoreProfile,
      login, register, logout
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
