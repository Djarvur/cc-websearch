type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function log(level: LogLevel, message: string): void {
  if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
    process.stderr.write(`[${level}] ${message}\n`);
  }
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
};
