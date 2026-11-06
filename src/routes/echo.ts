import { z } from 'zod';
import { defineRoute } from '../core/define-route.js';

export default defineRoute({
  name: 'echo',
  description: 'Returns the received message, optionally repeated N times.',
  input: {
    message: z.string().min(1).describe('Text to echo back'),
    times: z.number().int().min(1).max(10).default(1).describe('How many times to repeat it'),
  },
  output: {
    message: z.string(),
    repeated: z.array(z.string()),
    length: z.number(),
  },
  handler: ({ message, times }) => ({
    message,
    repeated: Array.from({ length: times }, () => message),
    length: message.length,
  }),
});
