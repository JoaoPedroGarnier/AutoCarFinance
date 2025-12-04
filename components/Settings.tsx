
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Store, Mail, Phone, Save, Download, Upload, CheckCircle, Database } from 'lucide-react';

const Settings: React.FC = () => {
  const { storeProfile, updateStoreProfile, exportData, importData } = useStore();
  const [formData, setFormData] = useState(storeProfile);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreProfile(formData);
    setMessage('Configurações salvas com sucesso!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importData(content)) {
        setMessage('Dados restaurados com sucesso!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao restaurar arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <h2 className="text-2xl font-bold text-slate-800">Configurações da Loja</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        {message && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100 animate-in fade-in flex items-center gap-2">
            <CheckCircle size={18} />
            {message}
          </div>
        )}
        
        {/* Aviso de Modo Local */}
        <div className="p-4 rounded-xl border flex items-center gap-3 bg-amber-50 border-amber-100 text-amber-800">
           <Database size={24} className="text-amber-600" />
           <div className="flex-1">
             <h3 className="font-bold text-sm uppercase mb-0.5">
               Modo Local (Offline)
             </h3>
             <p className="text-xs opacity-90">
               Seus dados estão salvos apenas neste navegador. Recomendamos fazer backups (exportar dados) regularmente.
             </p>
           </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Loja</label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full pl-10 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Ex: AutoCars"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Contato</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="contato@autocars.com.br"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-10 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="bg-brand-600 text-white px-6 py-2.5 rounded-lg hover:bg-brand-700 flex items-center gap-2 transition-colors shadow-sm shadow-brand-200 font-medium"
          >
            <Save size={20} />
            Salvar Alterações
          </button>
        </div>
      </form>

      {/* Backup Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Gestão de Dados Locais (Arquivo)
        </h3>
        <p className="text-sm text-slate-500">
            Use estas opções para salvar seus dados em um arquivo seguro ou restaurá-los em outro computador.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
                onClick={exportData}
                className="flex items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-all"
            >
                <Download size={20} />
                Baixar Backup (Exportar)
            </button>
            <label className="flex items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-all cursor-pointer">
                <Upload size={20} />
                Restaurar Backup (Importar)
                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;
