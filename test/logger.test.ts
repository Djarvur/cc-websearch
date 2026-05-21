import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createLogger', () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
  });

  it('should output info message with timestamp and module prefix', async () => {
    const { createLogger } = await import('../src/lib/logger.js');
    const logger = createLogger('test', 'info');
    logger.info('hello');

    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[info:test\] hello\n/),
    );
  });

  it('should suppress info messages when level is warn', async () => {
    const { createLogger } = await import('../src/lib/logger.js');
    const logger = createLogger('test', 'warn');
    logger.info('hello');

    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  it('should always output error messages regardless of level', async () => {
    const { createLogger } = await import('../src/lib/logger.js');
    const logger = createLogger('test', 'error');
    logger.error('fail');

    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[error:test\] fail\n/),
    );
  });

  it('should output debug messages after setLevel to debug', async () => {
    const { createLogger } = await import('../src/lib/logger.js');
    const logger = createLogger('test', 'info');

    // debug should be suppressed at info level
    logger.debug('before');
    expect(stderrWriteSpy).not.toHaveBeenCalled();

    // after setLevel, debug should output
    logger.setLevel('debug');
    logger.debug('after');
    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[debug:test\] after\n/),
    );
  });

  it('should include module name in output prefix', async () => {
    const { createLogger } = await import('../src/lib/logger.js');
    const logger = createLogger('ddg', 'info');
    logger.info('testing');

    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('[info:ddg]'),
    );
  });
});
