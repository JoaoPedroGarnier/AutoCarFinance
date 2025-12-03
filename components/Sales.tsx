
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Sale, VehicleStatus } from '../types';
import { Plus, Search, Calendar, DollarSign, User, Car, X, TrendingUp, AlertCircle } from 'lucide-react';

const Sales: React.FC = () => {
  const { sales, vehicles, customers, addSale } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived Data
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => v.status === VehicleStatus.AVAILABLE);
  }, [vehicles]);
  
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const projectedProfit = selectedVehicle && typeof salePrice === 'number' 
    ? salePrice - selectedVehicle.pricePurchase 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedCustomerId || !salePrice) return;

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const newSale: Sale = {
      id: Date.now().toString(),
      vehicleId: selectedVehicleId,
      customerId: selectedCustomerId,
      salePrice: Number(salePrice),
      profit: Number(salePrice) - vehicle.pricePurchase,
      date: saleDate,
    };

    addSale(newSale);
    setIsModalOpen(false);
    
    // Reset Form
    setSelectedVehicleId('');
    setSelectedCustomerId('');
    setSalePrice('');
    setSaleDate(new Date().toISOString().split('T')[0]);
  };

  const getVehicleName = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.make} ${v.model} ${v.version}` : 'Veículo desconhecido';
  };

  const getCustomerName = (id: string) => {
    const c = customers.find(c => c.id === id);
    return c ? c.name : 'Cliente desconhecido';
  };

  const filteredSales = sales.filter(sale => {
    const vName = getVehicleName(sale.vehicleId).toLowerCase();
    const cName = getCustomerName(sale.customerId).toLowerCase();
    const search = searchTerm.toLowerCase();
    return vName.includes(search) || cName.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Vendas</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-brand-200"
        >
          <Plus size={20} />
          Registrar Venda
        </button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar venda por veículo ou cliente..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
          <span className="text-sm text-slate-500 font-medium">Vendas no Período</span>
          <span className="text-xl font-bold text-brand-600">{filteredSales.length}</span>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Veículo</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Valor Venda</th>
              <th className="px-6 py-4">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(sale.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{getVehicleName(sale.vehicleId)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} />
                    {getCustomerName(sale.customerId)}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-brand-600">
                  R$ {sale.salePrice.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <TrendingUp size={12} />
                    R$ {sale.profit.toLocaleString('pt-BR')}
                  </span>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  Nenhuma venda registrada encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Registrar Nova Venda</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Car size={16} /> Selecionar Veículo (Estoque)
                </label>
                <select 
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer"
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    // Auto-fill suggested price
                    const v = vehicles.find(vec => vec.id === e.target.value);
                    if (v) setSalePrice(v.priceSelling);
                  }}
                >
                  <option value="" disabled className="text-slate-400">Selecione um veículo...</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id} className="text-slate-800">
                      {v.make} {v.model} - {`R$ ${v.priceSelling.toLocaleString('pt-BR')}`}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> Nenhum veículo disponível no estoque.
                  </p>
                )}
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User size={16} /> Cliente Comprador
                </label>
                <select 
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="" disabled className="text-slate-400">Selecione um cliente...</option>
                  {sortedCustomers.length > 0 ? (
                    sortedCustomers.map(c => (
                      <option key={c.id} value={c.id} className="text-slate-800">
                        {c.name} {c.phone ? `- ${c.phone}` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Nenhum cliente disponível</option>
                  )}
                </select>
                
                {sortedCustomers.length === 0 && (
                   <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2 flex items-start gap-2">
                     <AlertCircle size={16} className="mt-0.5 shrink-0" />
                     <span>
                       <strong>Lista vazia:</strong> Não há clientes cadastrados. Vá até a aba "Clientes" e cadastre um novo comprador.
                     </span>
                   </div>
                )}
              </div>

              {/* Price and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <DollarSign size={16} /> Valor da Venda (R$)
                  </label>
                  <input 
                    required
                    type="number" 
                    placeholder="0,00"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Calendar size={16} /> Data da Venda
                  </label>
                  <input 
                    required
                    type="date" 
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Summary Card */}
              {selectedVehicle && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Custo do Veículo:</span>
                    <span>R$ {selectedVehicle.pricePurchase.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700 pt-2 border-t border-slate-200">
                    <span>Lucro Estimado:</span>
                    <span className={projectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      R$ {projectedProfit.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={!selectedVehicleId || !selectedCustomerId || !salePrice}
                >
                  Confirmar Venda
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
