export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(module: string, level: LogLevel = 'info') {
  let currentLevel = level;

  function log(level: LogLevel, message: string): void {
    if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
      const timestamp = new Date().toISOString();
      process.stderr.write(`[${timestamp}] [${level}:${module}] ${message}\n`);
    }
  }

  return {
    debug: (msg: string) => log('debug', msg),
    info: (msg: string) => log('info', msg),
    warn: (msg: string) => log('warn', msg),
    error: (msg: string) => log('error', msg),
    setLevel: (newLevel: LogLevel) => { currentLevel = newLevel; },
  };
}
