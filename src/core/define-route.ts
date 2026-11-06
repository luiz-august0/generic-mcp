import type { z, ZodRawShape } from 'zod';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';

/** Call context provided by the SDK: cancellation `signal`, `sessionId`, `sendNotification`, etc. */
export type RouteContext = RequestHandlerExtra<ServerRequest, ServerNotification>;

type EmptyShape = Record<never, never>;
type Infer<S extends ZodRawShape> = z.infer<z.ZodObject<S>>;

/** Without `output`, the handler may return any serializable value; with `output`, it must match it. */
type HandlerReturn<O extends ZodRawShape> = [keyof O] extends [never] ? unknown : Infer<O>;

export interface Route<I extends ZodRawShape = EmptyShape, O extends ZodRawShape = EmptyShape> {
  /** Unique tool name. Allowed: letters, digits, `_`, `-` and `.` (1–128 characters). */
  name: string;
  title?: string;
  description: string;
  /** Zod shape of the arguments. Becomes the tool's `inputSchema` (JSON Schema). */
  input?: I;
  /** Optional zod shape of the result. Becomes the `outputSchema`; the SDK validates `structuredContent`. */
  output?: O;
  annotations?: ToolAnnotations;
  handler: (input: Infer<I>, ctx: RouteContext) => HandlerReturn<O> | Promise<HandlerReturn<O>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRoute = Route<any, any>;

const ROUTE_BRAND = Symbol.for('generic-mcp.route');
const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export function defineRoute<I extends ZodRawShape = EmptyShape, O extends ZodRawShape = EmptyShape>(
  route: Route<I, O>,
): Route<I, O> {
  if (!NAME_PATTERN.test(route.name)) {
    throw new Error(
      `Invalid route name "${route.name}": use only letters, digits, "_", "-" or "." (1–128 characters).`,
    );
  }
  return Object.assign(route, { [ROUTE_BRAND]: true });
}

export function isRoute(value: unknown): value is AnyRoute {
  return typeof value === 'object' && value !== null && ROUTE_BRAND in value;
}
