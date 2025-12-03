
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Vehicle, VehicleStatus, FuelType, Expense } from '../types';
import { generateVehicleDescription } from '../services/gemini';
import { Plus, Search, Sparkles, Filter, MoreVertical, X, Trash2, AlertTriangle, Upload, Image as ImageIcon, DollarSign, Wrench, FileText, Calendar } from 'lucide-react';

const Inventory: React.FC = () => {
  const { vehicles, addVehicle, removeVehicle, expenses, addExpense, removeExpense } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // States for actions
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  
  // States for Vehicle Expenses Modal
  const [vehicleForExpenses, setVehicleForExpenses] = useState<Vehicle | null>(null);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ description: '', amount: 0, category: 'Manutenção', date: new Date().toISOString().split('T')[0] });

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    make: '', model: '', year: new Date().getFullYear(), version: '', 
    plate: '', // Initialize plate
    mileage: 0, color: '', fuel: FuelType.GASOLINE, 
    pricePurchase: 0, priceSelling: 0, 
    status: VehicleStatus.AVAILABLE, description: '', photoUrl: ''
  });

  // --- Derived Data for Expenses Modal ---
  const currentVehicleExpenses = useMemo(() => {
    if (!vehicleForExpenses) return [];
    return expenses.filter(e => e.vehicleId === vehicleForExpenses.id);
  }, [expenses, vehicleForExpenses]);

  const currentVehicleTotalExpenses = currentVehicleExpenses.reduce((acc, e) => acc + e.amount, 0);
  const currentVehicleTotalCost = (vehicleForExpenses?.pricePurchase || 0) + currentVehicleTotalExpenses;

  // --- Handlers ---

  const handleGenerateDescription = async () => {
    if (!newVehicle.make || !newVehicle.model) {
      alert("Por favor insira Marca e Modelo primeiro.");
      return;
    }
    setIsLoadingAI(true);
    const desc = await generateVehicleDescription(newVehicle);
    setNewVehicle(prev => ({ ...prev, description: desc }));
    setIsLoadingAI(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVehicle(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle: Vehicle = {
      ...newVehicle as Vehicle,
      id: Math.random().toString(36).substr(2, 9),
      photoUrl: newVehicle.photoUrl || 'https://via.placeholder.com/400x300?text=Sem+Foto', // Default text if no image
      dateAdded: new Date().toISOString(),
    };
    addVehicle(vehicle);
    setIsModalOpen(false);
    // Reset form
    setNewVehicle({
        make: '', model: '', year: new Date().getFullYear(), version: '', 
        plate: '',
        mileage: 0, color: '', fuel: FuelType.GASOLINE, 
        pricePurchase: 0, priceSelling: 0, 
        status: VehicleStatus.AVAILABLE, description: '', photoUrl: ''
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForExpenses || !newExpense.description || !newExpense.amount) return;

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: Number(newExpense.amount),
      category: newExpense.category as any,
      date: newExpense.date || new Date().toISOString(),
      vehicleId: vehicleForExpenses.id
    };

    addExpense(expense);
    setIsExpenseFormOpen(false);
    setNewExpense({ description: '', amount: 0, category: 'Manutenção', date: new Date().toISOString().split('T')[0] });
  };

  const confirmDelete = () => {
    if (vehicleToDelete) {
      removeVehicle(vehicleToDelete);
      setVehicleToDelete(null);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.make.toLowerCase().includes(filter.toLowerCase()) || 
    v.model.toLowerCase().includes(filter.toLowerCase()) ||
    (v.plate && v.plate.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Estoque</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Adicionar Veículo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por Marca, Modelo ou Placa..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
          <Filter size={20} />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {filteredVehicles.map(vehicle => {
           // Calculate quick total cost for card display
           const vExpenses = expenses.filter(e => e.vehicleId === vehicle.id).reduce((acc, c) => acc + c.amount, 0);
           const vTotalCost = vehicle.pricePurchase + vExpenses;
           
           return (
          <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible hover:shadow-md transition-shadow relative group">
            <div className="relative h-48 bg-slate-200 rounded-t-xl overflow-hidden">
              <img src={vehicle.photoUrl} alt={vehicle.model} className="w-full h-full object-cover" />
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold 
                ${vehicle.status === VehicleStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 
                  vehicle.status === VehicleStatus.SOLD ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {vehicle.status}
              </div>
              {vehicle.plate && (
                <div className="absolute bottom-2 left-2 bg-slate-900/70 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm font-mono tracking-wider">
                  {vehicle.plate.toUpperCase()}
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2 relative">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{vehicle.make} {vehicle.model}</h3>
                  <p className="text-sm text-slate-500">{vehicle.version} • {vehicle.year}</p>
                </div>
                
                {/* Menu Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === vehicle.id ? null : vehicle.id)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  {activeMenuId === vehicle.id && (
                    <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-10 py-1 animate-in fade-in zoom-in duration-100">
                      <button 
                        onClick={() => {
                            setVehicleForExpenses(vehicle);
                            setActiveMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <DollarSign size={16} />
                        Gerenciar Despesas
                      </button>
                      <button 
                        onClick={() => {
                          setVehicleToDelete(vehicle.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>

              </div>
              
              <div className="mt-2 mb-3">
                 <div className="text-xs text-slate-400 flex justify-between">
                    <span>Compra: R$ {vehicle.pricePurchase.toLocaleString('pt-BR')}</span>
                    {vExpenses > 0 && <span className="text-rose-500">+ R$ {vExpenses.toLocaleString('pt-BR')}</span>}
                 </div>
                 {vExpenses > 0 && (
                    <div className="text-xs text-slate-500 font-medium text-right border-t border-slate-50 pt-1 mt-1">
                        Custo Total: R$ {vTotalCost.toLocaleString('pt-BR')}
                    </div>
                 )}
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">{vehicle.mileage.toLocaleString()} km</span>
                <span className="font-bold text-brand-600 text-lg">R$ {vehicle.priceSelling.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )}})}
        {filteredVehicles.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <p>Nenhum veículo encontrado.</p>
            </div>
        )}
      </div>

      {/* Backdrop for closing menus */}
      {activeMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setActiveMenuId(null)}></div>
      )}

      {/* Delete Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Excluir Veículo?</h3>
                <p className="text-sm text-slate-500">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja remover este veículo do estoque permanentemente?
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-sm font-medium flex items-center gap-2"
              >
                <Trash2 size={16} />
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Expenses Modal */}
      {vehicleForExpenses && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Despesas do Veículo</h3>
                        <p className="text-slate-500">{vehicleForExpenses.make} {vehicleForExpenses.model} {vehicleForExpenses.version}</p>
                        {vehicleForExpenses.plate && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono mt-1 inline-block">{vehicleForExpenses.plate}</span>}
                    </div>
                    <button onClick={() => setVehicleForExpenses(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                            <span className="text-xs text-slate-500 uppercase font-bold">Valor Compra</span>
                            <div className="text-lg font-bold text-slate-700 mt-1">R$ {vehicleForExpenses.pricePurchase.toLocaleString('pt-BR')}</div>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center">
                            <span className="text-xs text-rose-600 uppercase font-bold">Gastos Extras</span>
                            <div className="text-lg font-bold text-rose-700 mt-1">+ R$ {currentVehicleTotalExpenses.toLocaleString('pt-BR')}</div>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center">
                            <span className="text-xs text-slate-600 uppercase font-bold">Custo Total</span>
                            <div className="text-lg font-bold text-slate-900 mt-1">R$ {currentVehicleTotalCost.toLocaleString('pt-BR')}</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18}/> Histórico de Despesas</h4>
                        <button 
                            onClick={() => setIsExpenseFormOpen(!isExpenseFormOpen)}
                            className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${isExpenseFormOpen ? 'bg-slate-100 text-slate-600' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                        >
                            {isExpenseFormOpen ? <X size={16}/> : <Plus size={16}/>}
                            {isExpenseFormOpen ? 'Cancelar' : 'Nova Despesa'}
                        </button>
                    </div>

                    {/* Add Expense Form (Collapsible) */}
                    {isExpenseFormOpen && (
                        <form onSubmit={handleAddExpense} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Descrição</label>
                                    <input required type="text" placeholder="Ex: Funilaria porta direita" className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Categoria</label>
                                    <select className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Documentação">Documentação</option>
                                        <option value="Peças">Peças</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Valor (R$)</label>
                                    <input required type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Data</label>
                                    <input required type="date" className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-medium">Salvar</button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Expenses List */}
                    <div className="space-y-2">
                        {currentVehicleExpenses.length > 0 ? (
                            currentVehicleExpenses.map(exp => (
                                <div key={exp.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-rose-50 text-rose-600 p-2 rounded-lg mt-0.5"><Wrench size={16}/></div>
                                        <div>
                                            <p className="text-slate-800 font-medium text-sm">{exp.description}</p>
                                            <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                                                <span>{new Date(exp.date).toLocaleDateString('pt-BR')}</span>
                                                <span>•</span>
                                                <span className="bg-slate-100 px-1.5 rounded text-slate-500">{exp.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-rose-600">- R$ {exp.amount.toLocaleString('pt-BR')}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p>Nenhuma despesa registrada para este veículo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Create Modal (Existing) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Adicionar Novo Veículo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Image Upload Section */}
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">Foto do Veículo</label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${newVehicle.photoUrl ? 'border-brand-300 bg-slate-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                    {newVehicle.photoUrl ? (
                      <div className="relative w-full h-full">
                        <img src={newVehicle.photoUrl} alt="Preview" className="w-full h-full object-contain rounded-lg p-1" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                          <p className="text-white font-medium flex items-center gap-2"><Upload size={20} /> Alterar Foto</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-8 h-8 mb-4 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span></p>
                        <p className="text-xs text-slate-500">PNG, JPG ou JPEG</p>
                      </div>
                    )}
                    <input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marca</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} placeholder="Ex: Toyota" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modelo</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} placeholder="Ex: Corolla" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ano</label>
                  <input required type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.year} onChange={e => setNewVehicle({...newVehicle, year: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Versão</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.version} onChange={e => setNewVehicle({...newVehicle, version: e.target.value})} placeholder="Ex: XEi 2.0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Placa</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg uppercase" value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})} placeholder="ABC-1234" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Quilometragem (km)</label>
                  <input required type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.mileage} onChange={e => setNewVehicle({...newVehicle, mileage: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cor</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.color} onChange={e => setNewVehicle({...newVehicle, color: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Combustível</label>
                  <select className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.fuel} onChange={e => setNewVehicle({...newVehicle, fuel: e.target.value as FuelType})}>
                    {Object.values(FuelType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Preço de Compra</label>
                  <input required type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.pricePurchase} onChange={e => setNewVehicle({...newVehicle, pricePurchase: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Preço de Venda</label>
                  <input required type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={newVehicle.priceSelling} onChange={e => setNewVehicle({...newVehicle, priceSelling: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateDescription}
                    disabled={isLoadingAI}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    {isLoadingAI ? 'Gerando...' : 'Gerar com IA'}
                  </button>
                </div>
                <textarea 
                  className="w-full p-2 border border-slate-200 rounded-lg h-24" 
                  value={newVehicle.description} 
                  onChange={e => setNewVehicle({...newVehicle, description: e.target.value})}
                  placeholder="Digite os detalhes ou use a IA para gerar..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm shadow-brand-200">Salvar Veículo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
