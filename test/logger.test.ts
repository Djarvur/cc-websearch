import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to re-import the logger for each test since it reads env at module load
describe('logger', () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  async function getFreshLogger() {
    // Use dynamic import with cache busting to get fresh module
    vi.resetModules();
    const { logger } = await import('../src/lib/logger.js');
    return logger;
  }

  it('should write info message to stderr when LOG_LEVEL is info or debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'info');
    const logger = await getFreshLogger();
    logger.info('test message');
    expect(stderrWriteSpy).toHaveBeenCalledWith('[info] test message\n');
  });

  it('should suppress debug messages when LOG_LEVEL is info', async () => {
    vi.stubEnv('LOG_LEVEL', 'info');
    const logger = await getFreshLogger();
    logger.debug('debug message');
    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  it('should always write error messages regardless of LOG_LEVEL', async () => {
    vi.stubEnv('LOG_LEVEL', 'error');
    const logger = await getFreshLogger();
    logger.error('error message');
    expect(stderrWriteSpy).toHaveBeenCalledWith('[error] error message\n');
  });
});
