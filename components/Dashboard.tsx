
import React, { useMemo } from 'react';
import { useStore } from '../services/store';
import { VehicleStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Car, DollarSign, Wallet, Target, Percent } from 'lucide-react';

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { vehicles, sales, customers, expenses, storeProfile, updateStoreProfile } = useStore();

  // 1. Calculate Totals (KPIs)
  const totalRevenue = useMemo(() => sales.reduce((acc, curr) => acc + curr.salePrice, 0), [sales]);
  const salesProfit = useMemo(() => sales.reduce((acc, curr) => acc + curr.profit, 0), [sales]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  
  // Calculate expenses specifically related to vehicles (Maintenance)
  const maintenanceExpenses = useMemo(() => 
    expenses.filter(e => e.category === 'Manutenção').reduce((acc, curr) => acc + curr.amount, 0), 
  [expenses]);

  // Adjusted Gross Profit = Sales Profit - Vehicle Maintenance Costs
  const totalGrossProfit = salesProfit - maintenanceExpenses;

  // Net Profit = Sales Profit - All Operational Expenses
  const netProfit = salesProfit - totalExpenses;
  
  // Calculate Actual Margin % based on Gross Profit (as requested)
  // Formula: (Net Profit / Gross Profit) * 100
  const currentMargin = totalGrossProfit > 0 ? (netProfit / totalGrossProfit) * 100 : 0;
  
  const vehiclesInStock = useMemo(() => vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length, [vehicles]);

  // Handle Target Change
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    if (!isNaN(newVal) && newVal >= 0 && newVal <= 100) {
      updateStoreProfile({ ...storeProfile, targetMargin: newVal });
    }
  };

  // 2. Generate Chart Data (Dynamic aggregation by month)
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; sales: number; grossProfit: number; expenses: number; netProfit: number; rawDate: Date }>();
    const today = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`; // Unique Key: YYYY-M
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
      // Capitalize first letter
      const formattedName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      dataMap.set(key, { 
        name: formattedName, 
        sales: 0, 
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        rawDate: d 
      });
    }

    // Aggregate Sales Data
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
      
      if (dataMap.has(key)) {
        const entry = dataMap.get(key)!;
        entry.sales += sale.salePrice;
        entry.grossProfit += sale.profit;
      }
    });

    // Aggregate Expenses Data
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const key = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;
      
      if (dataMap.has(key)) {
        const entry = dataMap.get(key)!;
        entry.expenses += expense.amount;
      }
    });

    // Calculate Monthly Net Profit and return array
    return Array.from(dataMap.values()).map(entry => ({
      ...entry,
      netProfit: entry.grossProfit - entry.expenses
    }));
  }, [sales, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
        <div className="text-sm text-slate-500 hidden sm:block">
            Resumo financeiro atualizado em tempo real.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Receita Total (Vendas)" 
          value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`} 
          icon={<DollarSign size={24} />} 
          color="bg-emerald-500" 
        />
        <KPICard 
          title="Lucro Líquido (Loja)" 
          value={`R$ ${netProfit.toLocaleString('pt-BR')}`} 
          icon={<Wallet size={24} />} 
          color={netProfit >= 0 ? "bg-blue-500" : "bg-red-500"} 
        />
        <KPICard 
          title="Veículos em Estoque" 
          value={vehiclesInStock.toString()} 
          icon={<Car size={24} />} 
          color="bg-indigo-500" 
        />
        <KPICard 
          title="Lucro Bruto (Veículos)" 
          value={`R$ ${totalGrossProfit.toLocaleString('pt-BR')}`} 
          icon={<TrendingUp size={24} />} 
          color="bg-orange-500" 
        />
      </div>

      {/* Target Profit Margin Widget */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="p-3 rounded-full bg-purple-500 text-white hidden sm:block">
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="sm:hidden"><Target size={18} /></span>
              Meta de Lucro Líquido
            </h3>
            <p className="text-sm text-slate-500">Porcentagem do Lucro Bruto que vira Lucro Líquido.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full sm:w-auto flex-1 max-w-xl">
           <div className="flex flex-col w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">Eficiência Atual: <span className={currentMargin >= storeProfile.targetMargin ? 'text-emerald-600' : 'text-red-500'}>{currentMargin.toFixed(1)}%</span></span>
                <span className="text-slate-500">Meta: {storeProfile.targetMargin}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${currentMargin >= storeProfile.targetMargin ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(currentMargin, 0), 100)}%` }}
                ></div>
                {/* Marker for Target */}
                <div 
                   className="w-1 h-3 bg-slate-800 absolute -mt-3 opacity-30"
                   style={{ left: `${Math.min(storeProfile.targetMargin, 100)}%` }}
                ></div>
              </div>
           </div>

           <div className="flex flex-col items-end min-w-[100px]">
              <label className="text-xs text-slate-500 font-medium mb-1">Ajustar Meta (%)</label>
              <div className="relative w-full">
                <Percent className="absolute left-2 top-2 text-slate-400" size={14} />
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={storeProfile.targetMargin} 
                  onChange={handleTargetChange}
                  className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded text-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Fluxo de Caixa (Vendas x Despesas)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                />
                <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                />
                <Legend />
                <Bar dataKey="sales" name="Receita" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Evolução do Lucro Líquido</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                />
                <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Lucro Líquido']}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="netProfit" 
                    name="Lucro Líquido"
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
