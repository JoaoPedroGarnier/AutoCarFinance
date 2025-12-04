
export enum VehicleStatus {
  AVAILABLE = 'Disponível',
  RESERVED = 'Reservado',
  SOLD = 'Vendido',
}

export enum FuelType {
  GASOLINE = 'Gasolina',
  ETHANOL = 'Etanol',
  DIESEL = 'Diesel',
  HYBRID = 'Híbrido',
  ELECTRIC = 'Elétrico',
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  version: string;
  plate: string;
  mileage: number;
  color: string;
  fuel: FuelType;
  pricePurchase: number;
  priceSelling: number;
  status: VehicleStatus;
  description: string;
  photoUrl: string;
  dateAdded: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'Lead' | 'Negociação' | 'Cliente';
  notes: string;
}

export interface Sale {
  id: string;
  vehicleId: string;
  customerId: string;
  salePrice: number;
  date: string;
  profit: number;
}

export interface Expense {
  id: string;
  description: string;
  category: 'Aluguel' | 'Contas' | 'Manutenção' | 'Marketing' | 'Outros';
  amount: number;
  date: string;
  vehicleId?: string;
}

export interface StoreProfile {
  name: string;
  email: string;
  phone: string;
  targetMargin: number;
}

export interface User {
  id: string;
  email: string;
  password: string;
  storeName: string;
  role?: 'admin' | 'user';
}

export interface License {
  key: string;
  status: 'available' | 'used' | 'revoked';
  generatedBy: string;
  createdAt: string;
  usedBy?: string;
  usedAt?: string;
}

export type ViewState = 'dashboard' | 'inventory' | 'customers' | 'sales' | 'finance' | 'settings';