import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const RAW_BRAND = Symbol.for('generic-mcp.raw-result');

/**
 * Escape hatch: returns an MCP `CallToolResult` exactly as given
 * (e.g. `image`, `audio` or `resource_link` content), skipping the automatic conversion.
 */
export function rawResult(result: CallToolResult): CallToolResult {
  return Object.assign(result, { [RAW_BRAND]: true });
}

function isRawResult(value: unknown): value is CallToolResult {
  return typeof value === 'object' && value !== null && RAW_BRAND in value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Converts a handler's return value into a `CallToolResult`:
 * - object → JSON text + `structuredContent` with the object itself
 * - array  → JSON text + `structuredContent: { items }` (MCP requires an object)
 * - string → plain text
 * - other  → JSON text
 */
export function toToolResult(value: unknown): CallToolResult {
  if (isRawResult(value)) return value;

  const text = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? 'null');
  const result: CallToolResult = { content: [{ type: 'text', text }] };

  if (Array.isArray(value)) {
    result.structuredContent = { items: value };
  } else if (isPlainObject(value)) {
    result.structuredContent = value;
  }
  return result;
}
