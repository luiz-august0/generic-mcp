import { loadRoutes } from './core/loader.js';
import { createHttpApp } from './http.js';

try {
  process.loadEnvFile(); // load .env if present
} catch {
  // no .env: fall back to the defaults below
}

const PORT = Number(process.env.PORT ?? 3333);
const HOST = process.env.HOST ?? '127.0.0.1';

const routes = await loadRoutes();
const app = createHttpApp(routes, { host: HOST });

const httpServer = app.listen(PORT, HOST, (error?: Error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`generic-mcp listening on http://${HOST}:${PORT}/mcp`);
  console.log(`tools (${routes.length}): ${routes.map((r) => r.name).join(', ') || '(none)'}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
