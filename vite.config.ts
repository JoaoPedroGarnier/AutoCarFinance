
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    // Configuração essencial para GitHub Pages (Caminhos relativos)
    base: './',
    plugins: [react()],
    define: {
      // Mantemos apenas o API_KEY do Gemini mapeado para process.env para compatibilidade
      // O Firebase agora usa import.meta.env nativo
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
    },
  };
});