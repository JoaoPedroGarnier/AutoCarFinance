
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Mail, Lock, ArrowRight, UserPlus, Store, CheckCircle, Key, AlertTriangle, Cloud, CloudOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, isCloudSyncing } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [error, setError] = useState('');

  const getFirebaseErrorMessage = (err: any) => {
    const code = err.code || '';
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
      return 'E-mail ou senha incorretos.';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'Este e-mail já está em uso por outra conta.';
    }
    if (code.includes('auth/weak-password')) {
      return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    return err.message || 'Ocorreu um erro inesperado.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validação Global do Código de Acesso
    if (accessCode !== 'Auto12@') {
      setError('Código de acesso incorreto.');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('As senhas não conferem.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          setIsLoading(false);
          return;
        }
        
        await register({ email, password, storeName });
        // Sucesso no registro (redireciona auto pelo estado)
      } else {
        await login(email, password);
        // Sucesso no login
      }
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStoreName('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-50 p-8 flex flex-col items-center border-b border-slate-100 transition-colors duration-300">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center shadow-lg mb-4">
            <span className="text-2xl font-bold text-white tracking-widest">AC</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">AutoCars</h2>
          <p className="text-slate-500 text-sm mt-1">
            {isRegistering ? 'Crie sua conta na Nuvem' : 'Acesse de qualquer lugar'}
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium text-center animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Código de Acesso</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="password" 
                required
                placeholder="Chave de segurança"
                className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="text-sm font-medium text-slate-700 ml-1">Nome da Loja</label>
              <div className="relative">
                <Store className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  required={isRegistering}
                  placeholder="Minha Concessionária"
                  className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="email" 
                required
                placeholder="seu@email.com"
                className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="password" 
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegistering && (
             <div className="space-y-1 animate-in fade-in slide-in-from-top-4 duration-300">
             <label className="text-sm font-medium text-slate-700 ml-1">Confirmar Senha</label>
             <div className="relative">
               <CheckCircle className="absolute left-3 top-3 text-slate-400" size={20} />
               <input 
                 type="password" 
                 required={isRegistering}
                 placeholder="Repita a senha"
                 className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
               />
             </div>
           </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
            {!isLoading && (isRegistering ? <UserPlus size={20} /> : <ArrowRight size={20} />)}
          </button>
        </form>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100 space-y-3">
          <button 
            type="button"
            onClick={toggleMode}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline transition-colors block w-full"
          >
            {isRegistering ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se agora'}
          </button>

          {/* Connection Status Indicator */}
          <div className={`flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg border ${
            isCloudSyncing 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}>
            {isCloudSyncing ? <Cloud size={14} /> : <CloudOff size={14} />}
            {isCloudSyncing ? 'Conectado à Nuvem (Sincronização Ativa)' : 'Modo Local / Offline (Não Sincronizado)'}
          </div>
          {!isCloudSyncing && (
             <p className="text-[10px] text-amber-600 px-4">
               Para acessar em múltiplos dispositivos, configure as chaves do Firebase no seu provedor de hospedagem.
             </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
