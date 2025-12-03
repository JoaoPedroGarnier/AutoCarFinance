
import React, { useState } from 'react';
import { useStore } from './services/store';
import { ViewState } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Sales from './components/Sales';
import Finance from './components/Finance';
import Settings from './components/Settings';
import Login from './components/Login';
import { LayoutDashboard, Car, Users, BadgeDollarSign, Menu, X, LogOut, Settings as SettingsIcon, ShoppingBag } from 'lucide-react';

const App: React.FC = () => {
  const { storeProfile, isAuthenticated, logout } = useStore();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <Login />;
  }

  const NavItem: React.FC<{ view: ViewState; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 min-w-[2rem] bg-brand-500 rounded-lg flex items-center justify-center">
                <Car className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold tracking-tight truncate" title={storeProfile.name}>
                {storeProfile.name}
              </h1>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavItem view="dashboard" icon={<LayoutDashboard size={20} />} label="Painel" />
            <NavItem view="inventory" icon={<Car size={20} />} label="Estoque" />
            <NavItem view="customers" icon={<Users size={20} />} label="Clientes" />
            <NavItem view="sales" icon={<ShoppingBag size={20} />} label="Vendas" />
            <NavItem view="finance" icon={<BadgeDollarSign size={20} />} label="Financeiro" />
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <button 
              onClick={() => {
                setCurrentView('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <SettingsIcon size={20} />
              <span className="font-medium">Configurações</span>
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-600">
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{storeProfile.name}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border-2 border-white shadow-sm">
              AD
            </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'inventory' && <Inventory />}
            {currentView === 'customers' && <Customers />}
            {currentView === 'sales' && <Sales />}
            {currentView === 'finance' && <Finance />}
            {currentView === 'settings' && <Settings />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
