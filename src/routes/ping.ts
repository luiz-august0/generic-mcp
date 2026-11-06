import { defineRoute } from '../core/define-route.js';

export default defineRoute({
  name: 'ping',
  description: 'Checks whether the server is responding.',
  annotations: { readOnlyHint: true },
  handler: () => ({ pong: true, at: new Date().toISOString() }),
});
