import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (como API_KEY) do sistema ou arquivo .env
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Isso garante que 'process.env.API_KEY' no código seja substituído
      // pelo valor real da variável de ambiente durante o build do Vercel.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});