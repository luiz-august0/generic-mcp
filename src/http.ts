import type { Request, Response } from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AnyRoute } from './core/define-route.js';
import { createMcpServer } from './server.js';

export interface HttpOptions {
  host: string;
}

function jsonRpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null });
}

/**
 * Single entry point: `POST /mcp` (Streamable HTTP, stateless).
 * Each request gets a fresh McpServer + transport; routes are loaded only once, at boot.
 * On a local host, `createMcpExpressApp` already validates the Host header (DNS rebinding protection).
 */
export function createHttpApp(routes: readonly AnyRoute[], { host }: HttpOptions) {
  const app = createMcpExpressApp({ host });

  app.post('/mcp', async (req: Request, res: Response) => {
    const server = createMcpServer(routes);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[mcp] error handling request:', error);
      if (!res.headersSent) jsonRpcError(res, 500, -32603, 'Internal server error');
    }
  });

  // Stateless mode: there is no server-initiated SSE stream (GET) and no session to terminate (DELETE).
  const methodNotAllowed = (_req: Request, res: Response) => {
    res.set('Allow', 'POST');
    jsonRpcError(res, 405, -32000, 'Method not allowed.');
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, tools: routes.map((r) => r.name) });
  });

  return app;
}
