import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (env.VITE_GAME_SERVER_URL) {
    let url;
    try {
      url = new URL(env.VITE_GAME_SERVER_URL);
    } catch {
      throw new Error('VITE_GAME_SERVER_URL must be a complete WebSocket URL.');
    }
    if (
      !['ws:', 'wss:'].includes(url.protocol) ||
      url.pathname !== '/ws' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (env.VITE_STATIC_HOST === 'true' && url.protocol !== 'wss:')
    )
      throw new Error(
        'Use wss://your-server-host/ws for Pages, without credentials, query parameters or fragments.',
      );
  }
  return {
    base: './',
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/ws': { target: 'ws://127.0.0.1:3000', ws: true } },
    },
    build: { target: 'es2022' },
  };
});
