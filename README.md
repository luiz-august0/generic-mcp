# generic-mcp

Generic MCP server in TypeScript with **a single entry point**: `POST /mcp` (Streamable HTTP, JSON-RPC 2.0).
Every file in `src/routes/` automatically becomes an MCP **tool**.

## Running

```bash
yarn install
yarn dev                   # development (tsx watch)
yarn build && yarn start   # production (dist/)
```

The server listens on `http://127.0.0.1:3333/mcp`. To change it, set `PORT`/`HOST` in the environment or in a `.env`
file (see `.env.example`). `GET /health` lists the loaded tools.

## Creating a route

Create `src/routes/<any-name>.ts` (subfolders work too):

```ts
import { z } from 'zod';
import { defineRoute } from '../core/define-route.js';

export default defineRoute({
  name: 'find_user',                     // tool name: letters, digits, _ - .
  description: 'Finds a user by id',     // the LLM uses this to decide when to call it
  input: { id: z.string().describe('User ID') },
  // output: { ... }                     // optional: validates and documents the result
  handler: async ({ id }, ctx) => {
    return { id, name: 'John' };         // any serializable value
  },
});
```

Restart (`yarn dev` restarts on its own) and the tool shows up in `tools/list`.

**What happens to the handler's return value**

| Return value          | MCP result                                                 |
|-----------------------|------------------------------------------------------------|
| object                | JSON text + `structuredContent` with the object            |
| array                 | JSON text + `structuredContent: { items: [...] }`          |
| string                | plain text                                                 |
| `rawResult({...})`    | `CallToolResult` passed through unchanged (images, etc.)   |
| thrown exception      | `{ isError: true }` with the message (and a console log)   |

Invalid arguments are rejected by zod before reaching the handler.
`ctx` exposes `signal` (cancellation), `sessionId`, `sendNotification`, etc.

Loader conventions:
- files/folders starting with `_` are skipped (helpers or a disabled route);
- `*.test.ts`, `*.spec.ts` and `*.d.ts` are skipped;
- duplicate tool names abort startup with an error naming both files.

## Connecting to Claude Desktop

Claude Desktop connects to local servers over stdio. Use the `mcp-remote` bridge to point it at the HTTP endpoint.
Edit `~/.config/Claude/claude_desktop_config.json` (Linux; on macOS: `~/Library/Application Support/Claude/`):

```json
{
  "mcpServers": {
    "generic-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:3333/mcp"]
    }
  }
}
```

Keep the server running (`yarn start`) and restart Claude Desktop.

## Testing without a client

```bash
yarn inspect   # MCP Inspector: Transport "Streamable HTTP", URL http://127.0.0.1:3333/mcp
```

or with curl:

```bash
curl -s -X POST http://127.0.0.1:3333/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo","arguments":{"message":"hi"}}}'
```

## Layout

```
src/
├── index.ts            # bootstrap: loads .env and routes, starts HTTP
├── http.ts             # Express: POST /mcp (stateless), GET/DELETE /mcp → 405, GET /health
├── server.ts           # creates the McpServer and registers each route as a tool
├── core/
│   ├── define-route.ts # defineRoute() + types
│   ├── loader.ts       # auto-discovery of src/routes (or dist/routes)
│   └── result.ts       # return value → CallToolResult conversion; rawResult()
└── routes/             # your tools
```

Security: by default it only listens on `127.0.0.1` and rejects requests whose `Host` header is not local
(DNS rebinding protection). There is no authentication — do not expose it on `0.0.0.0` without adding some.
