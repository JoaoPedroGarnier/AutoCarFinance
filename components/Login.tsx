
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Mail, Lock, ArrowRight, UserPlus, Store, CheckCircle, Key } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState(''); // Estado para o código de acesso
  
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      // Logic for Registration
      
      // Validação do Código de Acesso
      if (accessCode !== 'Auto12@') {
        setError('Código de acesso inválido. Solicite permissão ao administrador.');
        return;
      }

      if (password !== confirmPassword) {
        setError('As senhas não conferem.');
        return;
      }
      if (password.length < 3) {
        setError('A senha deve ter pelo menos 3 caracteres.');
        return;
      }
      
      const success = register({ email, password, storeName });
      if (!success) {
        setError('Este e-mail já está cadastrado.');
      }
    } else {
      // Logic for Login
      const success = login(email, password);
      if (!success) {
        setError('E-mail ou senha inválidos.');
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStoreName('');
    setAccessCode('');
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
            {isRegistering ? 'Crie sua conta para começar' : 'Entre para gerenciar sua loja'}
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {isRegistering && (
            <>
              {/* Campo de Código de Acesso (Segurança) */}
              <div className="space-y-1 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-sm font-medium text-slate-700 ml-1">Código de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                    type="password" 
                    required={isRegistering}
                    placeholder="Código para cadastro"
                    className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-sm font-medium text-slate-700 ml-1">Nome da Loja</label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    required={isRegistering}
                    placeholder="Minha Concessionária"
                    className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="email" 
                required
                placeholder="seu@email.com"
                className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
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
                placeholder="••••••••"
                className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
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
                 placeholder="••••••••"
                 className="w-full pl-10 p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
               />
             </div>
           </div>
          )}

          <button 
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 active:scale-[0.98]"
          >
            {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
            {isRegistering ? <UserPlus size={20} /> : <ArrowRight size={20} />}
          </button>
        </form>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <button 
            type="button"
            onClick={toggleMode}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline transition-colors"
          >
            {isRegistering ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se agora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
