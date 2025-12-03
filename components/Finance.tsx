
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { TrendingDown, TrendingUp, DollarSign, Plus, X, Calendar, Tag, FileText } from 'lucide-react';
import { Expense } from '../types';

const CATEGORIES = ['Aluguel', 'Contas', 'Manutenção', 'Marketing', 'Outros'] as const;

const Finance: React.FC = () => {
  const { sales, expenses, addExpense } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: '',
    category: '' as any, // Start empty to show placeholder
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const totalSales = sales.reduce((acc, s) => acc + s.salePrice, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const net = sales.reduce((acc, s) => acc + s.profit, 0) - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || !newExpense.category) return;

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      category: newExpense.category as any,
      amount: Number(newExpense.amount),
      date: newExpense.date || new Date().toISOString(),
    };

    addExpense(expense);
    setIsModalOpen(false);
    
    // Reset Form
    setNewExpense({
      description: '',
      category: '' as any,
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Visão Financeira</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-rose-200"
        >
          <Plus size={20} />
          Registrar Despesa
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
            <h3 className="text-emerald-800 font-medium mb-2 flex items-center gap-2"><TrendingUp size={18}/> Vendas Brutas</h3>
            <p className="text-3xl font-bold text-emerald-900">R$ {totalSales.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl">
            <h3 className="text-rose-800 font-medium mb-2 flex items-center gap-2"><TrendingDown size={18}/> Despesas Totais</h3>
            <p className="text-3xl font-bold text-rose-900">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
            <h3 className="text-blue-800 font-medium mb-2 flex items-center gap-2"><DollarSign size={18}/> Lucro Líquido</h3>
            <p className={`text-3xl font-bold ${net >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
              R$ {net.toLocaleString('pt-BR')}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Vendas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Entradas (Vendas)</h3>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Valor</th>
                          <th className="p-4">Lucro da Venda</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {sales.map(s => (
                          <tr key={s.id}>
                              <td className="p-4">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                              <td className="p-4 font-medium text-emerald-600">+R$ {s.salePrice.toLocaleString('pt-BR')}</td>
                              <td className="p-4 text-slate-600">R$ {s.profit.toLocaleString('pt-BR')}</td>
                          </tr>
                      ))}
                      {sales.length === 0 && (
                        <tr><td colSpan={3} className="p-4 text-center text-slate-400">Nenhuma venda registrada.</td></tr>
                      )}
                  </tbody>
              </table>
            </div>
        </div>

        {/* Tabela de Despesas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Saídas (Despesas)</h3>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Descrição</th>
                          <th className="p-4">Categoria</th>
                          <th className="p-4">Valor</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {expenses.map(e => (
                          <tr key={e.id}>
                              <td className="p-4">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                              <td className="p-4">{e.description}</td>
                              <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 border border-slate-200">{e.category}</span></td>
                              <td className="p-4 font-medium text-rose-600">-R$ {e.amount.toLocaleString('pt-BR')}</td>
                          </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">Nenhuma despesa registrada.</td></tr>
                      )}
                  </tbody>
              </table>
            </div>
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Registrar Despesa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FileText size={16} /> Descrição da Despesa
                </label>
                <input 
                  required
                  type="text"
                  placeholder="Ex: Conta de Luz, Peças Civic, Marketing Facebook..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Tag size={16} /> Categoria
                  </label>
                  <select 
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value as any})}
                  >
                    <option value="" disabled className="text-slate-400">Selecione uma categoria...</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="text-slate-800">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Calendar size={16} /> Data
                  </label>
                  <input 
                    required
                    type="date"
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <DollarSign size={16} /> Valor (R$)
                </label>
                <input 
                  required
                  type="number"
                  placeholder="0,00"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm font-medium"
                >
                  Salvar Despesa
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
