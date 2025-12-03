
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vehicle, Customer, Sale, Expense, VehicleStatus, FuelType, StoreProfile, User } from '../types';

// --- MOCK DATABASE (In-Memory) ---
// This ensures data is separated by User ID. 
// In a real app, this would be a backend database.
interface UserData {
  vehicles: Vehicle[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  storeProfile: StoreProfile;
}

// Armazena dados de todos os usuários: { 'user_id_1': { ...data }, 'user_id_2': { ...data } }
const APP_DATA: Record<string, UserData> = {};

// --- INITIAL STATES ---
const EMPTY_STORE_PROFILE: StoreProfile = {
  name: '',
  email: '',
  phone: '',
  targetMargin: 20
};

const INITIAL_USERS: User[] = [];

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
  // Global List of Registered Users
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  
  // Current Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Data States (Loaded per user)
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(EMPTY_STORE_PROFILE);

  // --- PERSISTENCE EFFECT ---
  // Whenever data changes AND we have a logged-in user, save to the Mock DB
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      APP_DATA[currentUser.id] = {
        vehicles,
        customers,
        sales,
        expenses,
        storeProfile
      };
    }
  }, [vehicles, customers, sales, expenses, storeProfile, currentUser, isAuthenticated]);

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
  
  const login = (email: string, password: string): boolean => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      // 1. Set User
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // 2. Load User Data from "DB" or Initialize Empty
      const userData = APP_DATA[user.id] || {
        vehicles: [],
        customers: [],
        sales: [],
        expenses: [],
        storeProfile: {
          name: user.storeName,
          email: user.email,
          phone: '',
          targetMargin: 20
        }
      };

      // 3. Update State with User Data
      setVehicles(userData.vehicles);
      setCustomers(userData.customers);
      setSales(userData.sales);
      setExpenses(userData.expenses);
      setStoreProfile(userData.storeProfile);

      return true;
    }
    return false;
  };

  const register = (userData: Omit<User, 'id'>): boolean => {
    if (users.find(u => u.email === userData.email)) {
      return false; // User already exists
    }
    
    const newUser: User = { ...userData, id: Date.now().toString() };
    setUsers(prev => [...prev, newUser]);
    
    // Initialize Empty Data in "DB"
    APP_DATA[newUser.id] = {
      vehicles: [],
      customers: [],
      sales: [],
      expenses: [],
      storeProfile: {
        name: userData.storeName,
        email: userData.email,
        phone: '',
        targetMargin: 20
      }
    };
    
    // Auto Login
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    
    // Set Empty States for new user
    setVehicles([]);
    setCustomers([]);
    setSales([]);
    setExpenses([]);
    setStoreProfile({
      name: userData.storeName,
      email: userData.email,
      phone: '',
      targetMargin: 20
    });

    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    // Clear view state for security
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