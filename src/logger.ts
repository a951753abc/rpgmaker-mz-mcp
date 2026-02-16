/**
 * Safe logger — stderr only, never touches stdout.
 * stdout is reserved for MCP JSON-RPC protocol.
 */
export const logger = {
  info: (...args: unknown[]) => console.error('[INFO]', ...args),
  warn: (...args: unknown[]) => console.error('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.error('[DEBUG]', ...args);
  },
};
