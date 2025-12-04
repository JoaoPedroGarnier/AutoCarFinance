
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Mail, Lock, ArrowRight, Store, AlertTriangle, Cloud, Info, Key } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            setIsLoading(false);
            return;
        }
        
        // A validação do código agora é feita dentro do register no store
        await register({ email, password, storeName }, accessCode);
      } else {
        const success = await login(email, password);
        if (!success) setError('Credenciais inválidas ou usuário não encontrado.');
      }
    } catch (err: any) {
      console.error(err);
      // Tratamento de mensagens de erro amigáveis
      let msg = 'Ocorreu um erro. Tente novamente.';
      if (err.code === 'auth/invalid-credential') msg = 'Email ou senha incorretos.';
      if (err.message) msg = err.message; // Captura erros jogados pelo register (Ex: Licença inválida)
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">AutoCars</h1>
            <p className="text-slate-400 text-sm mt-1">Sistema de Gestão Automotiva</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {isRegistering && (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Loja</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                required 
                                type="text" 
                                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Nome da Loja"
                                value={storeName}
                                onChange={e => setStoreName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Código de Acesso / Licença</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                required 
                                type="text" 
                                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Chave de Licença ou Convite"
                                value={accessCode}
                                onChange={e => setAccessCode(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-1">Necessário para criar nova conta.</p>
                    </div>
                </>
            )}

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        required 
                        type="email" 
                        className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        required 
                        type="password" 
                        className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="******"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {isRegistering && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="password" 
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <button 
                disabled={isLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
                {!isLoading && <ArrowRight size={20} />}
            </button>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button 
                type="button" 
                onClick={() => { setError(''); setIsRegistering(!isRegistering); setAccessCode(''); }}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
            >
                {isRegistering ? 'Já possui conta? Fazer Login' : 'Não tem conta? Criar agora'}
            </button>
        </div>

        <div className="p-2 bg-slate-100 border-t border-slate-200 text-center">
             <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                {isCloudSyncing ? <Cloud size={14} className="text-blue-500" /> : <Info size={14} className="text-amber-500" />}
                <span>{isCloudSyncing ? 'Nuvem Conectada' : 'Modo Local (Offline)'}</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
