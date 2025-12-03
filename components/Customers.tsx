
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Customer } from '../types';
import { Mail, Phone, User, Plus, Trash2, AlertTriangle, MapPin } from 'lucide-react';

const Customers: React.FC = () => {
  const { customers, addCustomer, removeCustomer } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ 
    name: '', 
    email: '', 
    phone: '', 
    address: '', 
    status: 'Lead', 
    notes: '' 
  });
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomer.name) {
      addCustomer({ ...newCustomer, id: Date.now().toString() } as Customer);
      setShowForm(false);
      setNewCustomer({ name: '', email: '', phone: '', address: '', status: 'Lead', notes: '' });
    }
  };

  const initiateDelete = (id: string) => {
    setCustomerToDelete(id);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      removeCustomer(customerToDelete);
      setCustomerToDelete(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Clientes e Leads</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition-colors">
          <Plus size={18} /> Adicionar Cliente
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Nome Completo</label>
              <input required className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: João Silva" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="email@exemplo.com" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Telefone / WhatsApp</label>
              <input className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="(00) 00000-0000" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Endereço</label>
              <input className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="Rua, Número, Bairro, Cidade - UF" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white" value={newCustomer.status} onChange={e => setNewCustomer({...newCustomer, status: e.target.value as any})}>
                <option value="Lead">Lead</option>
                <option value="Negociação">Negociação</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
             <button type="submit" className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 font-medium transition-colors">Salvar Cliente</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Contato & Endereço</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => initiateDelete(c.id)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                      title="Excluir Cliente"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <User size={16} />
                    </div>
                    <span className="font-medium text-slate-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-sm text-slate-500 gap-1">
                    {c.email && <span className="flex items-center gap-2"><Mail size={12}/> {c.email}</span>}
                    {c.phone && <span className="flex items-center gap-2"><Phone size={12}/> {c.phone}</span>}
                    {c.address && <span className="flex items-center gap-2 text-slate-400 mt-1"><MapPin size={12}/> {c.address}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded text-xs font-semibold 
                    ${c.status === 'Cliente' ? 'bg-emerald-100 text-emerald-700' : 
                      c.status === 'Negociação' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{c.notes}</td>
              </tr>
            ))}
            {customers.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        Nenhum cliente cadastrado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Excluir Cliente?</h3>
                <p className="text-sm text-slate-500">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja remover este cliente da sua base de dados?
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCustomerToDelete(null)}
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
    </div>
  );
};

export default Customers;
