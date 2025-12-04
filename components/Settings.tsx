
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { updateFirebaseConfig, resetFirebaseConfig } from '../services/firebase';
import { getDropboxAuthUrl, saveDropboxToken, getDropboxToken, clearDropboxToken, uploadToDropbox, downloadFromDropbox } from '../services/dropbox';
import { Store, Mail, Phone, Save, Download, Upload, Cloud, CloudOff, Info, Database, ChevronDown, ChevronUp, Box, CheckCircle, RefreshCw, Trash2, Smartphone, Copy } from 'lucide-react';

const Settings: React.FC = () => {
  const { storeProfile, updateStoreProfile, exportData, getDataForExport, importData, isCloudSyncing, currentUser } = useStore();
  const [formData, setFormData] = useState(storeProfile);
  const [message, setMessage] = useState('');
  
  // Cloud Config State (Firebase)
  const [showCloudForm, setShowCloudForm] = useState(false);
  const [cloudConfig, setCloudConfig] = useState({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
  });

  // Dropbox State
  const [dropboxAppKey, setDropboxAppKey] = useState(localStorage.getItem('autocars_dropbox_key') || '');
  const [isDropboxConnected, setIsDropboxConnected] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    // Check if we are returning from Dropbox Auth
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
            saveDropboxToken(token);
            setIsDropboxConnected(true);
            setMessage('Dropbox conectado com sucesso!');
            window.history.replaceState(null, '', window.location.pathname);
        }
    } else {
        if (getDropboxToken()) {
            setIsDropboxConnected(true);
        }
    }
  }, []);

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

  // --- FIREBASE HANDLERS ---
  const handleSaveCloud = () => {
      if (!cloudConfig.apiKey || !cloudConfig.projectId) {
          alert("Por favor, preencha pelo menos a API Key e o Project ID.");
          return;
      }
      updateFirebaseConfig(cloudConfig);
  };

  const handleJsonPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
          const val = e.target.value;
          const jsonStart = val.indexOf('{');
          const jsonEnd = val.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = val.substring(jsonStart, jsonEnd + 1);
              const parsed = JSON.parse(jsonStr);
              setCloudConfig({
                  apiKey: parsed.apiKey || '',
                  authDomain: parsed.authDomain || '',
                  projectId: parsed.projectId || '',
                  storageBucket: parsed.storageBucket || '',
                  messagingSenderId: parsed.messagingSenderId || '',
                  appId: parsed.appId || ''
              });
          }
      } catch (err) {
          // Ignora erro
      }
  };

  // --- DROPBOX HANDLERS ---
  const handleConnectDropbox = () => {
      if (!dropboxAppKey) {
          alert("Por favor, insira a App Key do Dropbox.");
          return;
      }
      localStorage.setItem('autocars_dropbox_key', dropboxAppKey);
      window.location.href = getDropboxAuthUrl(dropboxAppKey);
  };

  const handleDisconnectDropbox = () => {
      clearDropboxToken();
      setIsDropboxConnected(false);
      setMessage("Dropbox desconectado.");
  };

  const handleDropboxUpload = async () => {
      setDropboxLoading(true);
      try {
          const data = getDataForExport();
          await uploadToDropbox(data);
          setMessage("Backup salvo no Dropbox com sucesso!");
      } catch (e: any) {
          setMessage(`Erro ao salvar: ${e.message}`);
          if (e.message.includes('Sessão expirada')) setIsDropboxConnected(false);
      } finally {
          setDropboxLoading(false);
      }
  };

  const handleDropboxDownload = async () => {
      setDropboxLoading(true);
      try {
          const data = await downloadFromDropbox();
          const success = importData(data);
          if (success) {
              setMessage("Dados restaurados do Dropbox com sucesso!");
          } else {
              setMessage("Erro ao processar o arquivo de backup do Dropbox.");
          }
      } catch (e: any) {
          setMessage(`Erro ao restaurar: ${e.message}`);
          if (e.message.includes('Sessão expirada')) setIsDropboxConnected(false);
      } finally {
          setDropboxLoading(false);
      }
  };

  const copyUserId = () => {
    if (currentUser) {
        navigator.clipboard.writeText(currentUser.id);
        setMessage("ID copiado para a área de transferência!");
        setTimeout(() => setMessage(''), 2000);
    }
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
        
        {/* Status da Sincronização */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${isCloudSyncing ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
           {isCloudSyncing ? <Cloud size={24} className="text-indigo-600" /> : <CloudOff size={24} className="text-amber-600" />}
           <div className="flex-1">
             <h3 className="font-bold text-sm uppercase mb-0.5 flex items-center gap-2">
               {isCloudSyncing ? 'Sincronização em Nuvem Ativa' : 'Modo Local (Offline)'}
             </h3>
             <p className="text-xs opacity-90">
               {isCloudSyncing 
                 ? 'Seus dados são salvos automaticamente. Acesse de qualquer dispositivo usando o mesmo email e senha.' 
                 : 'Seus dados estão salvos apenas neste navegador.'}
             </p>
             {isCloudSyncing && currentUser && (
                 <div className="mt-2 flex items-center gap-2">
                     <div className="text-xs bg-white/50 p-1.5 rounded inline-flex items-center gap-1 font-mono text-indigo-900 border border-indigo-200">
                        <Smartphone size={10} /> ID Conta: {currentUser.id.substring(0, 8)}...
                     </div>
                     <button type="button" onClick={copyUserId} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Copy size={10} /> Copiar
                     </button>
                 </div>
             )}
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

      {/* Dropbox Backup Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-4">
             <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Box size={20} className="text-blue-500" /> Backup em Nuvem (Dropbox)
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Salve cópias de segurança ou restaure seus dados diretamente do Dropbox.
                </p>
             </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            {!isDropboxConnected ? (
                <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1">Dropbox App Key</label>
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-2 border border-slate-300 rounded text-sm"
                            placeholder="Insira sua App Key do Dropbox"
                            value={dropboxAppKey}
                            onChange={e => setDropboxAppKey(e.target.value)}
                        />
                        <button 
                            type="button"
                            onClick={handleConnectDropbox}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Conectar
                        </button>
                     </div>
                     <p className="text-xs text-slate-400 mt-1">
                        Necessário criar um App em <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Dropbox Developers</a>. Redirect URI: <code>{window.location.origin}/</code>
                     </p>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={16}/> Dropbox Conectado
                        </span>
                        <button onClick={handleDisconnectDropbox} className="text-xs text-red-500 hover:text-red-700 underline">
                            Desconectar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button 
                            type="button"
                            onClick={handleDropboxUpload}
                            disabled={dropboxLoading}
                            className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 border-dashed rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
                        >
                            <Upload size={24} className="text-slate-400 group-hover:text-blue-500 mb-2" />
                            <span className="font-semibold text-slate-700 group-hover:text-blue-700">Salvar Backup</span>
                            <span className="text-xs text-slate-400 text-center mt-1">Envia dados atuais para o Dropbox (backup_autocars.json)</span>
                        </button>

                        <button 
                            type="button"
                            onClick={handleDropboxDownload}
                            disabled={dropboxLoading}
                            className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 border-dashed rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all group"
                        >
                            {dropboxLoading ? <RefreshCw size={24} className="animate-spin text-slate-400"/> : <Download size={24} className="text-slate-400 group-hover:text-emerald-500 mb-2" />}
                            <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Restaurar Backup</span>
                            <span className="text-xs text-slate-400 text-center mt-1">Substitui dados atuais pelo arquivo do Dropbox</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Cloud Configuration Section (Firebase) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Database size={20} /> Banco de Dados Tempo Real (Firebase)
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Conecte seu próprio banco de dados para habilitar a sincronização online.
                </p>
            </div>
            {isCloudSyncing && (
                <button 
                    onClick={resetFirebaseConfig}
                    className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                    <Trash2 size={12}/> Desconectar
                </button>
            )}
        </div>

        {!isCloudSyncing ? (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <button 
                    type="button"
                    onClick={() => setShowCloudForm(!showCloudForm)}
                    className="flex items-center justify-between w-full text-left text-slate-700 font-medium mb-2"
                >
                    <span>Configurar Manualmente</span>
                    {showCloudForm ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </button>
                
                {showCloudForm && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 pt-2">
                        <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 mb-2">
                            <strong>Dica:</strong> Cole o objeto <code>config</code> inteiro do console do Firebase na caixa abaixo ou preencha os campos individualmente.
                        </div>

                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Colar JSON de Configuração (Opcional)</label>
                             <textarea 
                                className="w-full p-2 text-xs font-mono border border-slate-300 rounded bg-white h-20"
                                placeholder='{ "apiKey": "...", "authDomain": "..." }'
                                onChange={handleJsonPaste}
                             ></textarea>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">API Key</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={cloudConfig.apiKey}
                                    onChange={e => setCloudConfig({...cloudConfig, apiKey: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Project ID</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={cloudConfig.projectId}
                                    onChange={e => setCloudConfig({...cloudConfig, projectId: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Auth Domain</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={cloudConfig.authDomain}
                                    onChange={e => setCloudConfig({...cloudConfig, authDomain: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">App ID</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={cloudConfig.appId}
                                    onChange={e => setCloudConfig({...cloudConfig, appId: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveCloud}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                            Salvar e Conectar
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                    <Database size={20} />
                </div>
                <div>
                    <p className="text-sm font-bold text-emerald-800">Conectado ao Firebase</p>
                    <p className="text-xs text-emerald-600 break-all">Projeto: {storeProfile.name || 'Personalizado'}</p>
                </div>
            </div>
        )}
      </div>

      {/* Backup Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Gestão de Dados Locais (Arquivo)
        </h3>
        <p className="text-sm text-slate-500">
            Use estas opções para transferir seus dados manualmente se não estiver usando a nuvem.
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
