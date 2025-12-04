
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Mail, Lock, ArrowRight, Store, AlertTriangle, Info, Key, Laptop } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, resetPassword } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    // Fluxo de Esqueci Minha Senha
    if (showForgotPassword) {
        if (!email) {
            setError('Digite seu email para recuperar a senha.');
            return;
        }
        setIsLoading(true);
        try {
            await resetPassword(email);
            // Em modo local, o resetPassword lança um alert com a senha, então se passar, ok.
            setShowForgotPassword(false);
        } catch (err: any) {
            setError(err.message || 'Erro ao recuperar senha.');
        } finally {
            setIsLoading(false);
        }
        return;
    }

    if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            setIsLoading(false);
            return;
        }
        
        await register({ email, password, storeName }, accessCode);
      } else {
        const success = await login(email, password);
        if (!success) setError('Credenciais inválidas ou usuário não encontrado.');
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Ocorreu um erro. Tente novamente.';
      
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este email já está cadastrado.';
      } else if (err.code === 'auth/invalid-access-code') {
        msg = 'Código de acesso incorreto.';
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setError('');
      setter(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">AutoCars</h1>
            <p className="text-slate-400 text-sm mt-1">Sistema de Gestão Automotiva</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {successMessage && (
                <div className="p-3 rounded-lg text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in">
                    {successMessage}
                </div>
            )}
            
            {error && (
                <div className="p-3 rounded-lg text-sm flex items-start gap-2 bg-red-50 text-red-600 border border-red-100 animate-in fade-in">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {!showForgotPassword && isRegistering && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Código de Acesso</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="text" 
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Código do Vendedor"
                            value={accessCode}
                            onChange={e => handleInputChange(setAccessCode, e.target.value)}
                        />
                    </div>
                </div>
            )}

            {!showForgotPassword && isRegistering && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Loja</label>
                    <div className="relative">
                        <Store className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="text" 
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Nome da Loja"
                            value={storeName}
                            onChange={e => handleInputChange(setStoreName, e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        required 
                        type="email" 
                        className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => handleInputChange(setEmail, e.target.value)}
                    />
                </div>
            </div>

            {!showForgotPassword && (
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-semibold text-slate-700">Senha</label>
                        {!isRegistering && (
                             <button 
                                type="button"
                                onClick={() => { setShowForgotPassword(true); setError(''); }}
                                className="text-xs text-blue-600 hover:underline"
                             >
                                Esqueci a senha
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="password" 
                            minLength={6}
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={e => handleInputChange(setPassword, e.target.value)}
                        />
                    </div>
                </div>
            )}

            {!showForgotPassword && isRegistering && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="password" 
                            minLength={6}
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={e => handleInputChange(setConfirmPassword, e.target.value)}
                        />
                    </div>
                </div>
            )}

            <button 
                disabled={isLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70"
            >
                {isLoading ? 'Processando...' : (showForgotPassword ? 'Recuperar Senha' : (isRegistering ? 'Criar Conta' : 'Entrar'))}
                {!isLoading && !showForgotPassword && <ArrowRight size={20} />}
            </button>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            {showForgotPassword ? (
                <button 
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setError(''); }}
                    className="text-sm text-slate-600 hover:text-slate-800 hover:underline font-medium"
                >
                    Voltar para Login
                </button>
            ) : (
                <button 
                    type="button" 
                    onClick={() => { setError(''); setIsRegistering(!isRegistering); }}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                >
                    {isRegistering ? 'Já possui conta? Fazer Login' : 'Não tem conta? Criar agora'}
                </button>
            )}
        </div>

        <div className="p-2 bg-slate-100 border-t border-slate-200 text-center">
             <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <Info size={14} className="text-amber-500" />
                <span>Modo Local (Offline) - Apenas este aparelho</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
