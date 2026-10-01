import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

export default ({ command }) => {
  const isProd = command === 'build';

  return defineConfig({
    base: './',
    build: {
      target: ['chrome100'],
      sourcemap: isProd ? 'hidden' : true,
      outDir: 'dist',
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (warning.code === 'SOURCEMAP_ERROR') {
            return;
          }

          defaultHandler(warning);
        },
        output: {
          manualChunks: {
            react: ['react'],
            'react-dom': ['react-dom'],
            'react-router-dom': ['react-router-dom'],
          },
        },
      },
    },
    resolve: {
      alias: [{ find: '@', replacement: path.join(__dirname, './src') }],
    },
    plugins: [
      react(),
      tailwindcss(),
      svgr(),
    ],
    server: {
      allowedHosts: true,
    },
  });
};
