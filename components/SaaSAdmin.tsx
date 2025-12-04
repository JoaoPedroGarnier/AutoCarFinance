
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { License } from '../types';
import { db, isFirebaseConfigured } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Key, Copy, CheckCircle, Clock, ShieldCheck, User } from 'lucide-react';

const SaaSAdmin: React.FC = () => {
  const { currentUser } = useStore();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  const LICENSES_KEY = 'autocars_licenses';

  const fetchLicenses = async () => {
    setLoading(true);
    try {
        if (isFirebaseConfigured && db) {
            const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                key: doc.id,
                createdAt: (doc.data().createdAt as any).toDate ? (doc.data().createdAt as any).toDate().toISOString() : doc.data().createdAt
            })) as License[];
            setLicenses(list);
        } else {
            // Local Mock
            const localData = localStorage.getItem(LICENSES_KEY);
            if (localData) setLicenses(JSON.parse(localData));
        }
    } catch (error) {
        console.error("Erro ao buscar licenças:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const generateLicense = async () => {
    // Gerar chave aleatória: XXXX-XXXX-XXXX
    const randomPart = () => Math.random().toString(36).substr(2, 4).toUpperCase();
    const newKey = `SAAS-${randomPart()}-${randomPart()}-${randomPart()}`;
    
    const newLicense: License = {
        key: newKey,
        status: 'available',
        generatedBy: currentUser?.email || 'admin',
        createdAt: new Date().toISOString()
    };

    setLoading(true);
    try {
        if (isFirebaseConfigured && db) {
            // Usar o ID do documento como a própria chave para facilitar busca
            // Mas Firestore setDoc requer ID, aqui estamos criando documento
            // Vamos usar setDoc com a chave
            const { setDoc, doc } = await import('firebase/firestore');
            await setDoc(doc(db, 'licenses', newKey), {
                ...newLicense,
                createdAt: Timestamp.now()
            });
        } else {
            const current = JSON.parse(localStorage.getItem(LICENSES_KEY) || '[]');
            const updated = [newLicense, ...current];
            localStorage.setItem(LICENSES_KEY, JSON.stringify(updated));
        }
        setGeneratedKey(newKey);
        await fetchLicenses();
    } catch (e) {
        console.error(e);
        alert('Erro ao gerar licença');
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado: ' + text);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-brand-600"/> Painel Administrativo SaaS
            </h2>
            <p className="text-slate-500 text-sm">Gerencie o acesso dos lojistas ao sistema.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Gerar Nova Licença</h3>
            <p className="text-sm text-slate-500 mb-4">Crie uma chave de acesso única para vender a um novo cliente.</p>
            <button 
                onClick={generateLicense}
                disabled={loading}
                className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors font-bold flex items-center gap-2"
            >
                <Key size={20}/>
                {loading ? 'Gerando...' : 'Gerar Chave de Acesso'}
            </button>
         </div>

         {generatedKey && (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl flex flex-col items-center animate-in fade-in zoom-in">
                <span className="text-emerald-800 text-sm font-bold uppercase mb-2">Licença Gerada com Sucesso</span>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-200 shadow-sm">
                    <code className="text-xl font-mono font-bold text-slate-800 tracking-wider">{generatedKey}</code>
                    <button onClick={() => copyToClipboard(generatedKey)} className="text-slate-400 hover:text-brand-600 transition-colors" title="Copiar">
                        <Copy size={20}/>
                    </button>
                </div>
                <p className="text-xs text-emerald-600 mt-2">Envie este código para o seu cliente.</p>
            </div>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-slate-800">Licenças Emitidas</h3>
             <button onClick={fetchLicenses} className="text-sm text-brand-600 hover:underline">Atualizar Lista</button>
        </div>
        <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                    <th className="px-6 py-4">Chave</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Utilizado Por</th>
                    <th className="px-6 py-4">Data Criação</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {licenses.map(lic => (
                    <tr key={lic.key} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono font-medium text-slate-700 select-all">{lic.key}</td>
                        <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit
                                ${lic.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 
                                  lic.status === 'used' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                                {lic.status === 'available' ? <CheckCircle size={12}/> : <User size={12}/>}
                                {lic.status === 'available' ? 'Disponível' : 'Em Uso'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                            {lic.usedBy ? (
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-700">ID: {lic.usedBy.substr(0,8)}...</span>
                                    <span className="text-xs">{lic.usedAt ? new Date(lic.usedAt).toLocaleDateString() : ''}</span>
                                </div>
                            ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <Clock size={14}/>
                                {new Date(lic.createdAt).toLocaleDateString()}
                            </div>
                        </td>
                    </tr>
                ))}
                {licenses.length === 0 && (
                    <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma licença gerada ainda.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default SaaSAdmin;
