import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // PWA temporarily disabled for Vercel build compatibility
    // Will re-enable after fixing tsconfig.app.json path resolution
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg', 'favicon.webp', '*.webp'],
    //   manifest: {
    //     name: 'QuantumX Oracle Challenge',
    //     short_name: 'QuantumX',
    //     description: 'AI-Powered Crypto Prediction Market - Make predictions, earn QX tokens',
    //     theme_color: '#8B5CF6',
    //     background_color: '#0B0C10',
    //     display: 'standalone',
    //     orientation: 'portrait-primary',
    //     start_url: '/',
    //     scope: '/',
    //     categories: ['finance', 'productivity', 'business'],
    //     screenshots: [],
    //     icons: [
    //       {
    //         src: '/favicon.webp',
    //         sizes: '192x192',
    //         type: 'image/webp',
    //         purpose: 'any maskable'
    //       },
    //       {
    //         src: '/favicon.webp',
    //         sizes: '512x512',
    //         type: 'image/webp',
    //         purpose: 'any maskable'
    //       }
    //     ],
    //   },
    //   devOptions: {
    //     enabled: false
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,webp,svg,woff2}'],
    //   },
    // }),
    // Add Brotli and Gzip compression for production
    mode === 'production' && compression({
      algorithms: ['brotliCompress'],
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
    mode === 'production' && compression({
      algorithms: ['gzip'],
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build for production
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          'chart-vendor': ['recharts', 'lightweight-charts'],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          'swiper': ['swiper'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable source maps for production debugging
    sourcemap: mode === 'production' ? false : true,
    // Minify for smaller bundles - using esbuild
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    // ✅ KEEP console logs in production for engine status visibility
    // Users need to see "[Hub]" and "[SignalDB]" logs to know system is working
    esbuild: {
      drop: mode === 'production' ? ['debugger'] : [],  // Only drop debugger, keep console.log
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    exclude: ['lovable-tagger'],
  },
}));
