
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Store, Mail, Phone, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { storeProfile, updateStoreProfile } = useStore();
  const [formData, setFormData] = useState(storeProfile);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreProfile(formData);
    setMessage('Configurações salvas com sucesso!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Configurações da Loja</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        {message && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
            {message}
          </div>
        )}
        
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

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm">
        <p><strong>Dica:</strong> Essas informações serão utilizadas em documentos impressos e na identificação da loja no sistema.</p>
      </div>
    </div>
  );
};

export default Settings;
