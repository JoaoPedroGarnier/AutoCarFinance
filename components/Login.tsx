
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Mail, Lock, ArrowRight, Store, AlertTriangle, Cloud, Info, LogIn, Key, Smartphone, Laptop } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, isCloudSyncing, resetPassword } = useStore();
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
            setSuccessMessage('Email de redefinição enviado! Verifique sua caixa de entrada.');
            setTimeout(() => {
                setShowForgotPassword(false);
                setSuccessMessage('');
            }, 5000);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email.');
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // Validação básica de senha no front-end para evitar rejeição da API
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
      // Tratamento de mensagens de erro amigáveis
      let msg = 'Ocorreu um erro. Tente novamente.';
      
      if (err.code === 'auth/email-already-in-use') {
        msg = 'EMAIL_DUPLICADO'; // Flag especial tratada no render
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Email ou senha incorretos.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        msg = '⚠️ Configuração Pendente: O método de login "Email/Senha" não está ativado no Firebase Console. Acesse o console do Firebase > Authentication > Sign-in method e ative-o.';
      } else if (err.code === 'auth/invalid-access-code') {
        msg = 'Código de acesso inválido. Contate o administrador.';
      } else if (err.message) {
        msg = err.message;
      }
      
      // Auto-Login Logic for duplicate email on registration
      if (msg === 'EMAIL_DUPLICADO' && isRegistering) {
          try {
              // Tenta logar silenciosamente
              const loginSuccess = await login(email, password);
              if (loginSuccess) return; // Sucesso, o componente vai desmontar
          } catch {
              // Se falhar o login automático, mantém o erro de duplicado para o usuário decidir
          }
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setError(''); // Limpa erro ao digitar
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
                <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 border animate-in fade-in slide-in-from-top-1 ${error.includes('Configuração Pendente') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {error === 'EMAIL_DUPLICADO' ? (
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle size={16} />
                                <span>Este e-mail já possui conta.</span>
                             </div>
                             <button 
                                type="button" 
                                onClick={() => { setIsRegistering(false); setError(''); }}
                                className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                             >
                                <LogIn size={14}/> Fazer Login Agora
                             </button>
                        </div>
                    ) : error === 'Email ou senha incorretos.' && !isRegistering ? (
                         <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => { setShowForgotPassword(true); setError(''); }}
                                className="text-xs text-red-700 font-bold hover:underline self-end"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
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
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Código do Vendedor"
                            value={accessCode}
                            onChange={e => handleInputChange(setAccessCode, e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 ml-1">Código necessário apenas para o cadastro.</p>
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
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                        className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => handleInputChange(setEmail, e.target.value)}
                    />
                </div>
            </div>

            {!showForgotPassword && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            required 
                            type="password" 
                            minLength={6}
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={e => handleInputChange(setConfirmPassword, e.target.value)}
                        />
                    </div>
                </div>
            )}

            <button 
                disabled={isLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Processando...' : (showForgotPassword ? 'Enviar Email de Recuperação' : (isRegistering ? 'Criar Conta' : 'Entrar'))}
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
                {isCloudSyncing ? <Cloud size={14} className="text-blue-500" /> : <Info size={14} className="text-amber-500" />}
                <span>
                    {isCloudSyncing 
                        ? 'Nuvem Conectada - Sincronização Automática' 
                        : 'Modo Local (Offline) - Apenas este aparelho'}
                </span>
             </div>
             {isCloudSyncing && !isRegistering && !showForgotPassword && (
                 <div className="mt-2 flex justify-center text-[11px] text-slate-500 gap-3 items-center bg-white/50 py-1 rounded mx-4">
                    <span className="flex items-center gap-1"><Smartphone size={12} /> Celular</span>
                    <span className="flex items-center gap-1"><Laptop size={12} /> Computador</span>
                    <span className="font-semibold text-blue-600">Acesse em qualquer lugar</span>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default Login;
