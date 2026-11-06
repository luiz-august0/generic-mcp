import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape } from 'zod';
import type { AnyRoute } from './core/define-route.js';
import { toToolResult } from './core/result.js';

const pkg = createRequire(import.meta.url)('../package.json') as { name: string; version: string };

/** Creates an McpServer instance with every route registered as a tool. */
export function createMcpServer(routes: readonly AnyRoute[]): McpServer {
  const server = new McpServer({ name: pkg.name, version: pkg.version });

  for (const route of routes) {
    server.registerTool<ZodRawShape, ZodRawShape>(
      route.name,
      {
        title: route.title,
        description: route.description,
        inputSchema: route.input ?? {},
        outputSchema: route.output,
        annotations: route.annotations,
      },
      async (args, ctx) => {
        try {
          return toToolResult(await route.handler(args, ctx));
        } catch (error) {
          console.error(`[tool:${route.name}]`, error);
          throw error; // the SDK turns this into an { isError: true } result for the client
        }
      },
    );
  }
  return server;
}
